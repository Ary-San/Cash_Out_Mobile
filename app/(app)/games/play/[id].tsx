import { useRef, useState, type ComponentRef } from "react"
import { ScrollView, View } from "react-native"
import { router, useLocalSearchParams, useNavigation, usePreventRemove } from "expo-router"
import { Construction, SearchX } from "lucide-react-native"
import { ApiError, toApiError, userMessage, type ApiError as ApiErrorType } from "@/api/errors"
import { ChoiceGame } from "@/components/minigames/ChoiceGame"
import { LoanGame } from "@/components/minigames/LoanGame"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Notice } from "@/components/ui/Notice"
import { Screen } from "@/components/ui/Screen"
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States"
import { Text } from "@/components/ui/Text"
import { useApiQuery } from "@/hooks/useApiQuery"
import { useReducedMotion } from "@/hooks/useReducedMotion"
import { confirmAction } from "@/lib/confirm"
import { formatSignedTokens, formatTokens } from "@/lib/market"
import { packFor, prepareRun, runLength, scoreFor, verdict, type GameRun } from "@/lib/minigames"
import { financeService } from "@/services/financeService"
import { minigameService } from "@/services/minigameService"
import type { Minigame, MinigameSession } from "@/types/minigames"

type Phase = { name: "intro" } | { name: "playing"; run: GameRun } | { name: "done"; correct: number; total: number; score: number }
type SaveState = { status: "saving" } | { status: "saved"; session: MinigameSession } | { status: "error"; error: ApiErrorType }

/** Un minijuego de practica, de a uno: reglas, la partida y lo que ganaste. */
export default function MinigamePlayScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const navigation = useNavigation()
  const game = useApiQuery(["minigame", id], (signal) =>
    Number.isInteger(id) && id > 0 ? minigameService.get(id, signal) : Promise.reject(new ApiError({ kind: "http", status: 404 })),
  )
  const wallet = useApiQuery(["token-wallet"], (signal) => financeService.wallet(signal))
  const [phase, setPhase] = useState<Phase>({ name: "intro" })
  const [save, setSave] = useState<SaveState>({ status: "saving" })
  // Cada pregunta nueva empieza arriba, y al responder se baja a la explicacion (sin animar con "Reducir movimiento").
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null)
  const reduced = useReducedMotion()
  const toTop = () => scroll.current?.scrollTo({ y: 0, animated: !reduced })
  const toAnswer = () => setTimeout(() => scroll.current?.scrollToEnd({ animated: !reduced }), 50)

  // La partida se registra recien al terminar: salir a la mitad no cobra, pero se pierde lo jugado.
  usePreventRemove(phase.name === "playing", ({ data }) => {
    void confirmAction({
      title: "¿Salir de la partida?",
      message: "Si sales ahora, la partida no se registra: no se cobra nada, pero tampoco ganas fichas.",
      confirmLabel: "Salir",
    }).then((ok) => {
      if (ok) navigation.dispatch(data.action)
    })
  })

  if (game.error?.status === 404) {
    return <Gone icon={SearchX} title="No encontramos este juego" message="Puede que ya no esté publicado o que el enlace no sea correcto." />
  }
  if (game.error && !game.data) {
    return (
      <Screen back title="Minijuego">
        <ErrorState error={game.error} onRetry={game.reload} />
      </Screen>
    )
  }
  if (!game.data) {
    return (
      <Screen back title="Minijuego">
        <Skeleton height={220} />
      </Screen>
    )
  }

  const data = game.data
  const pack = packFor(data)
  if (!pack) {
    return <Gone icon={Construction} title="Este juego todavía no se puede jugar en la app" message="Ya está en el catálogo, pero su contenido aún no llega a esta versión." />
  }

  const register = async (target: Minigame, score: number) => {
    setSave({ status: "saving" })
    try {
      const session = await minigameService.play(target.id, score)
      setSave({ status: "saved", session })
      wallet.reload()
    } catch (err) {
      setSave({ status: "error", error: toApiError(err) })
    }
  }

  const finish = (run: GameRun, correct: number) => {
    const total = runLength(run)
    const score = scoreFor(correct, total)
    setPhase({ name: "done", correct, total, score })
    toTop()
    void register(data, score)
  }

  const balance = wallet.data?.tokenBalance
  const missing = balance === undefined ? 0 : data.tokenCost - balance
  // Un juego pagado no empieza sin saber si alcanzan las fichas: al terminar, el backend lo rechazaria.
  const unknownBalance = data.tokenCost > 0 && balance === undefined

  return (
    <Screen back title={data.title} subtitle={pack.description} scrollRef={scroll}>
      {phase.name === "intro" ? (
        <Card className="gap-3.5">
          <Text weight="semibold" className="text-base">Cómo se juega</Text>
          <Text tone="muted" className="text-sm leading-5">{pack.rules}</Text>
          <View className="flex-row gap-2">
            <Fact label="Costo" value={data.tokenCost === 0 ? "Gratis" : formatTokens(data.tokenCost)} />
            <Fact label="Premio máximo" value={formatTokens(data.maxTokenReward)} tone="gain" />
          </View>
          <Fact label="Tus fichas" value={balance === undefined ? "—" : formatTokens(balance)} />
          <Text tone="muted" className="text-[13px] leading-5">
            Ganas según tu puntaje, de 0 a 100: con 100 te llevas el premio completo y con 50, la mitad.
            {data.tokenCost > 0 ? " El costo se descuenta cuando terminas la partida." : ""}
          </Text>
          {unknownBalance && wallet.error ? <ErrorState error={wallet.error} onRetry={wallet.reload} /> : null}
          {missing > 0 ? <Notice tone="error">{`Te faltan ${formatTokens(missing)} para jugar. Ganas fichas cumpliendo tus metas de ahorro o con los juegos gratis.`}</Notice> : null}
          <Button label="Empezar partida" disabled={missing > 0 || wallet.isLoading || unknownBalance} onPress={() => setPhase({ name: "playing", run: prepareRun(pack) })} />
        </Card>
      ) : phase.name === "playing" ? (
        phase.run.type === "SIMULATION" ? (
          <LoanGame rounds={phase.run.rounds} onFinish={(correct) => finish(phase.run, correct)} onAnswered={toAnswer} onNext={toTop} />
        ) : (
          <ChoiceGame
            questions={phase.run.questions}
            unit={phase.run.type === "QUIZ" ? "Situación" : "Pregunta"}
            onFinish={(correct) => finish(phase.run, correct)}
            onAnswered={toAnswer}
            onNext={toTop}
          />
        )
      ) : (
        <Card className="gap-3">
          <Text accessibilityRole="header" weight="semibold" className="text-xl">Tu puntaje: {phase.score} de 100</Text>
          <Text tone="muted" className="text-sm">Acertaste {phase.correct} de {phase.total}. {verdict(phase.score)}</Text>
          {save.status === "saving" ? (
            <Text role="status" tone="muted" className="text-sm">Registrando tu partida…</Text>
          ) : save.status === "error" ? (
            <Notice tone="error">{`No pudimos registrar tu partida. ${userMessage(save.error)}`}</Notice>
          ) : (
            <SessionTokens session={save.session} balance={wallet.isRefreshing ? undefined : wallet.data?.tokenBalance} />
          )}
          {save.status === "error" && save.error.retryable ? <Button label="Reintentar" onPress={() => void register(data, phase.score)} /> : null}
          <Button
            label="Jugar otra vez"
            variant={save.status === "saved" ? "primary" : "outline"}
            disabled={save.status === "saving"}
            onPress={() => setPhase({ name: "intro" })}
          />
          <Button label="Ver todos los juegos" variant="outline" onPress={() => router.back()} />
        </Card>
      )}
    </Screen>
  )
}

function SessionTokens({ session, balance }: { session: MinigameSession; balance: number | undefined }) {
  const net = session.tokensEarned - session.tokensSpent
  return (
    <View className="gap-2">
      <View className="flex-row gap-2">
        <Fact label="Costo" value={session.tokensSpent === 0 ? "Gratis" : formatSignedTokens(-session.tokensSpent)} tone={session.tokensSpent > 0 ? "loss" : undefined} />
        <Fact label="Ganaste" value={formatSignedTokens(session.tokensEarned)} tone={session.tokensEarned > 0 ? "gain" : undefined} />
      </View>
      <Fact label="Resultado" value={formatSignedTokens(net)} tone={net > 0 ? "gain" : net < 0 ? "loss" : undefined} />
      {balance !== undefined ? <Text tone="muted" className="text-sm">Ahora tienes {formatTokens(balance)}.</Text> : null}
    </View>
  )
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: "gain" | "loss" }) {
  return (
    <View className="flex-1 rounded-xl bg-muted px-3 py-2">
      <Text tone="muted" className="text-xs">{label}</Text>
      <Text weight="semibold" tone={tone ?? "default"} className="text-base" style={{ fontVariant: ["tabular-nums"] }}>{value}</Text>
    </View>
  )
}

function Gone({ icon, title, message }: { icon: typeof SearchX; title: string; message: string }) {
  return (
    <Screen back title="Minijuego">
      <EmptyState icon={icon} title={title} message={message} action={{ label: "Volver a minijuegos", onPress: () => router.back() }} />
    </Screen>
  )
}
