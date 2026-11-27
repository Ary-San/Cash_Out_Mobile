import { memo, useEffect, useRef } from "react"
import { RoomPrize } from "@/components/games/RoomPrize"
import { router, useLocalSearchParams, useNavigation, usePreventRemove } from "expo-router"
import { useKeepAwake } from "expo-keep-awake"
import { View } from "react-native"
import { SearchX } from "lucide-react-native"
import { toApiError, userMessage } from "@/api/errors"
import { LessonCard, UpDownRanking, VoteTally, formatPoints } from "@/components/updown/UpDownBoards"
import { RoomCodeCard } from "@/components/games/RoomCodeCard"
import { UpDownChart } from "@/components/updown/UpDownChart"
import { VoteForm } from "@/components/updown/VoteForm"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Screen } from "@/components/ui/Screen"
import { EmptyState, Skeleton } from "@/components/ui/States"
import { Text, Title } from "@/components/ui/Text"
import { useToast } from "@/components/ui/Toast"
import { useAsyncAction } from "@/hooks/useAsyncAction"
import { useLiveRoom } from "@/hooks/useLiveRoom"
import { confirmAction } from "@/lib/confirm"
import { haptics } from "@/lib/haptics"
import { UPDOWN_RULES, choiceMeta, formatChange } from "@/lib/updown"
import { updownService } from "@/services/updownService"
import type { UpDownChoice, UpDownView } from "@/types/updown"

/**
 * Una sala de "¿Sube o baja?". La misma pantalla sirve al anfitrion (codigo, QR y
 * los botones para empezar, revelar y pasar de ronda) y al jugador (votar y ver
 * como le fue). El anfitrion tambien puede jugar: entonces ve las dos cosas.
 */
export default function UpDownRoomScreen() {
  // Mientras se juega la pantalla no se apaga: las rondas duran 20 s.
  useKeepAwake()
  const toast = useToast()
  const code = String(useLocalSearchParams<{ code: string }>().code ?? "").toUpperCase()
  const { view, connection, apply } = useLiveRoom<UpDownView>(`/updown-rooms/${code}/events`)
  const navigation = useNavigation()

  // Solo el anfitrion revela y pasa de ronda: si sale a mitad del juego, todos se quedan esperando.
  const hosting = Boolean(view?.host) && (view?.phase === "VOTING" || view?.phase === "REVEAL")
  usePreventRemove(hosting, ({ data }) => {
    void confirmAction({
      title: "¿Salir de la sala?",
      message: "Eres el anfitrión: la partida queda en pausa hasta que vuelvas a entrar con el código.",
      confirmLabel: "Salir",
    }).then((ok) => {
      if (ok) navigation.dispatch(data.action)
    })
  })

  // Al revelar, una vibracion corta dice si acertaste antes de leer el resultado (una vez por ronda).
  const felt = useRef(0)
  const revealedRound = view?.phase === "REVEAL" && view.me?.voted ? view.round : 0
  const won = (view?.me?.delta ?? 0) > 0
  useEffect(() => {
    if (!revealedRound || felt.current === revealedRound) return
    felt.current = revealedRound
    if (won) haptics.success()
    else haptics.warning()
  }, [revealedRound, won])

  const act = useAsyncAction(async (run: (code: string) => Promise<UpDownView>) => {
    try {
      apply(await run(code))
    } catch (error) {
      toast(userMessage(toApiError(error)))
    }
  })
  const vote = useAsyncAction(async (choice: UpDownChoice, bet: number) => {
    try {
      apply(await updownService.vote(code, choice, bet))
      haptics.success()
    } catch (error) {
      toast(userMessage(toApiError(error)))
    }
  })
  const cancel = async () => {
    const ok = await confirmAction({ title: "¿Cerrar la sala?", message: "Termina el juego para todos los que están dentro.", confirmLabel: "Cerrar sala", destructive: true })
    if (!ok) return
    try {
      await updownService.cancel(code)
      router.back()
    } catch (error) {
      toast(userMessage(toApiError(error)))
    }
  }

  if (!view) {
    if (connection === "missing") return <Gone title="No encontramos esta sala" />
    return (
      <Screen back title="¿Sube o baja?" subtitle={`Sala ${code}`}>
        <Skeleton height={220} />
      </Screen>
    )
  }
  if (view.phase === "CANCELLED") return <Gone title="El anfitrión cerró la sala" />

  const playing = view.phase === "VOTING" || view.phase === "REVEAL"
  const status = [`Sala ${view.code}`, playing ? `Ronda ${view.round} de ${view.totalRounds}` : null, connection === "reconnecting" ? "Reconectando…" : null]
    .filter(Boolean)
    .join(" · ")

  return (
    <Screen back title="¿Sube o baja?" subtitle={status}>
      {view.phase === "FINISHED" ? (
        <Final view={view} />
      ) : view.phase === "LOBBY" ? (
        <Lobby view={view} busy={act.isPending} onJoin={() => act.run(updownService.join)} onStart={() => act.run(updownService.start)} onCancel={() => void cancel()} />
      ) : (
        <>
          <Question view={view} />
          {view.phase === "VOTING" ? <Timer view={view} /> : null}

          {/* El jugador: entrar si todavia no esta, votar o ver como le fue. */}
          {!view.me ? (
            view.host ? null : <JoinCard view={view} busy={act.isPending} onJoin={() => act.run(updownService.join)} />
          ) : view.phase === "REVEAL" ? (
            <RoundResult view={view} />
          ) : view.me.voted ? (
            <Card className="items-center gap-1.5">
              <Text tone={choiceMeta(view.me.choice!).tone} className="text-3xl">{choiceMeta(view.me.choice!).icon}</Text>
              <Text weight="semibold" className="text-center text-base">
                Apostaste {formatPoints(view.me.bet)} pts a que {choiceMeta(view.me.choice!).label.toLowerCase()}
              </Text>
              <Text tone="muted" className="text-sm">Esperando a los demás · {view.tally.answered} de {view.ranking.length}</Text>
            </Card>
          ) : (
            <VoteForm key={view.round} view={view} busy={vote.isPending} onVote={(choice, bet) => vote.run(choice, bet)} />
          )}

          {view.phase === "REVEAL" && view.question?.reveal ? <LessonCard reveal={view.question.reveal} /> : null}

          {/* Lo que ve toda la sala; el anfitrion ademas maneja las rondas. */}
          <Card className="gap-3">
            <Text weight="medium" className="text-sm">Cómo vota la sala · {view.tally.answered} de {view.ranking.length}</Text>
            <VoteTally options={view.tally.options} answered={view.tally.answered} winner={view.question?.reveal?.outcome} />
          </Card>
          <Card className="gap-2 px-2">
            <Text weight="medium" className="px-2 text-sm">Ranking</Text>
            <UpDownRanking ranking={view.ranking} showDelta={view.phase === "REVEAL"} limit={8} />
          </Card>
          {view.host ? (
            view.phase === "REVEAL" ? (
              <Button
                label={view.round >= view.totalRounds ? "Ver el resultado final" : "Siguiente ronda"}
                loading={act.isPending}
                onPress={() => act.run(updownService.next)}
              />
            ) : (
              <Button label="Revelar ya" variant="outline" loading={act.isPending} onPress={() => act.run(updownService.reveal)} />
            )
          ) : view.me && view.phase === "REVEAL" ? (
            <Text tone="muted" className="text-center text-sm">La siguiente ronda la abre el anfitrión.</Text>
          ) : null}
        </>
      )}
    </Screen>
  )
}

function Lobby({ view, busy, onJoin, onStart, onCancel }: { view: UpDownView; busy: boolean; onJoin: () => void; onStart: () => void; onCancel: () => void }) {
  if (!view.host) {
    return view.me ? (
      <Card className="gap-2">
        <Title size="md">Ya estás dentro</Title>
        <Text tone="muted" className="text-sm leading-5">Cuando el anfitrión empiece, vas a ver la noticia y tus botones para votar.</Text>
        <Text tone="accent" weight="medium" className="text-sm">Esperando al anfitrión…</Text>
      </Card>
    ) : (
      <JoinCard view={view} busy={busy} onJoin={onJoin} />
    )
  }
  return (
    <>
      <RoomCodeCard game="updown" code={view.code} />
      <Card className="gap-2.5">
        <Text weight="medium" className="text-sm">En la sala · {view.ranking.length} de {view.maxPlayers}</Text>
        {view.ranking.length === 0 ? (
          <Text tone="muted" className="text-sm">Todavía no entra nadie. Cuando escaneen el QR o pongan el código, van a aparecer aquí.</Text>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {view.ranking.map((player) => (
              <View key={player.id} className="min-h-9 flex-row items-center rounded-full bg-muted px-3">
                <Text weight="medium" className="text-sm">{player.name}{player.me ? " (tú)" : ""}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
      <Card className="gap-2">
        <Text weight="medium" className="text-sm">Cómo se juega</Text>
        {UPDOWN_RULES.map((rule) => (
          <Text key={rule} tone="muted" className="text-[13px] leading-5">• {rule}</Text>
        ))}
      </Card>
      {!view.me ? <Button label="Jugar yo también" variant="outline" loading={busy} onPress={onJoin} /> : null}
      <Button label="Empezar" disabled={view.ranking.length === 0} loading={busy} onPress={onStart} />
      <Button label="Cerrar sala" variant="outline" onPress={onCancel} />
    </>
  )
}

function JoinCard({ view, busy, onJoin }: { view: UpDownView; busy: boolean; onJoin: () => void }) {
  return (
    <Card className="gap-3">
      <Title size="md">¿Sube o baja?</Title>
      <Text tone="muted" className="text-sm leading-5">
        {view.phase === "LOBBY"
          ? `Lee la noticia, mira el gráfico y apuesta qué pasó el mes siguiente. Empiezas con ${formatPoints(view.startPoints)} puntos.`
          : `El juego ya empezó (ronda ${view.round} de ${view.totalRounds}), pero todavía puedes entrar con ${formatPoints(view.startPoints)} puntos.`}
      </Text>
      <Button label="Entrar a la sala" loading={busy} onPress={onJoin} />
      <Text tone="muted" className="text-xs">Es gratis. Al terminar, el podio gana 30, 20 y 10 fichas si juegan 2 o más.</Text>
    </Card>
  )
}

// Cada segundo llega un estado nuevo (el reloj): el grafico solo cambia de una ronda a otra o al revelar.
const Question = memo(
  function Question({ view }: { view: UpDownView }) {
    return <QuestionCard question={view.question!} />
  },
  (prev, next) => prev.view.round === next.view.round && Boolean(prev.view.question?.reveal) === Boolean(next.view.question?.reveal),
)

function QuestionCard({ question }: { question: NonNullable<UpDownView["question"]> }) {
  return (
    <Card className="gap-3">
      <View className="gap-1">
        <Text tone="muted" className="text-xs">{question.period} · {question.sector}</Text>
        <Text weight="semibold" className="text-[15px] leading-5">{question.context}</Text>
      </View>
      <UpDownChart past={question.past} future={question.future} outcome={question.reveal?.outcome} height={130} />
      <Text tone="muted" className="text-xs">
        Línea punteada: el día de la noticia. Franja: «Igual» (±2 %).{question.reveal ? "" : " A la derecha, el mes siguiente, tapado."}
      </Text>
    </Card>
  )
}

function Timer({ view }: { view: UpDownView }) {
  const share = view.votingSeconds > 0 ? view.secondsLeft / view.votingSeconds : 0
  return (
    <View className="gap-1.5">
      <View className="flex-row justify-between">
        <Text tone="muted" className="text-sm">Tiempo para votar</Text>
        <Text weight="semibold" className="text-sm" style={{ fontVariant: ["tabular-nums"] }}>0:{String(view.secondsLeft).padStart(2, "0")}</Text>
      </View>
      <View className="h-1.5 overflow-hidden rounded-full bg-muted">
        <View className="h-full rounded-full bg-accent-ink" style={{ width: `${share * 100}%` }} />
      </View>
    </View>
  )
}

function RoundResult({ view }: { view: UpDownView }) {
  const me = view.me!
  const tone = !me.voted ? "muted" : me.delta > 0 ? "gain" : "loss"
  return (
    <Card role="status" className="items-center gap-1">
      <Text tone="muted" className="text-sm">{!me.voted ? "No votaste a tiempo" : me.delta > 0 ? "¡Acertaste!" : "Esta vez no"}</Text>
      <Text weight="semibold" tone={tone} className="text-4xl" style={{ fontVariant: ["tabular-nums"] }}>
        {!me.voted ? "±0" : `${me.delta > 0 ? "+" : "−"}${formatPoints(Math.abs(me.delta))} pts`}
      </Text>
      <Text className="text-sm">Ahora tienes {formatPoints(me.points)} pts · puesto {me.rank} de {view.ranking.length}</Text>
    </Card>
  )
}

function Final({ view }: { view: UpDownView }) {
  const me = view.me
  return (
    <>
      <Card className="gap-3">
        <Title size="lg">{me ? `Terminaste #${me.rank}` : "Resultado final"}</Title>
        {me ? (
          <Text tone="muted" className="text-sm">
            de {view.ranking.length}, con {formatPoints(me.points)} puntos y {me.hits} de {view.totalRounds} aciertos.
          </Text>
        ) : null}
        {me ? <RoomPrize prize={me.prize} players={view.ranking.length} /> : null}
        <UpDownRanking ranking={view.ranking} />
      </Card>
      {view.history.length > 0 ? (
        <Card className="gap-2">
          <Text weight="medium" className="text-sm">Lo que pasó en cada ronda</Text>
          {view.history.map((round, i) => {
            const meta = choiceMeta(round.outcome)
            return (
              <View key={`${round.date}-${i}`} className="min-h-9 flex-row items-center gap-3">
                <Text tone="muted" className="w-5 text-sm">{i + 1}</Text>
                <Text numberOfLines={1} className="flex-1 text-sm">{round.name}</Text>
                <Text weight="medium" tone={meta.tone} className="text-sm" style={{ fontVariant: ["tabular-nums"] }}>{meta.icon} {formatChange(round.changePercent)}</Text>
              </View>
            )
          })}
        </Card>
      ) : null}
      <Button label="Volver a minijuegos" variant="outline" onPress={() => router.back()} />
    </>
  )
}

function Gone({ title }: { title: string }) {
  return (
    <Screen back title="¿Sube o baja?">
      <EmptyState
        icon={SearchX}
        title={title}
        message="Puede que el código esté mal, que la sala se haya cerrado o que el juego haya terminado hace rato."
        action={{ label: "Volver a minijuegos", onPress: () => router.back() }}
      />
    </Screen>
  )
}
