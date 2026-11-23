import { useEffect, useRef } from "react"
import { View } from "react-native"
import { router, useLocalSearchParams, useNavigation, usePreventRemove } from "expo-router"
import { useKeepAwake } from "expo-keep-awake"
import { Check, SearchX } from "lucide-react-native"
import { toApiError, userMessage } from "@/api/errors"
import { RoomCodeCard } from "@/components/games/RoomCodeCard"
import { AllocationEditor } from "@/components/portfolioGame/AllocationEditor"
import { MixBar, PortfolioBoard, SectorReturns, formatGamePoints, useSectorColor } from "@/components/portfolioGame/PortfolioBoards"
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
import { PORTFOLIO_GAME_RULES, contributions, finalLesson } from "@/lib/portfolioGame"
import { formatChange } from "@/lib/updown"
import { portfolioGameService } from "@/services/portfolioGameService"
import type { PortfolioGameView } from "@/types/portfolioGame"
import { usePalette } from "@/theme/palette"

const TITLE = "Arma tu portafolio"

/**
 * Una sala de "Arma tu portafolio". La misma pantalla sirve al anfitrion (codigo,
 * QR, empezar y revelar cada semestre) y al jugador (repartir el 100 % y ver como
 * le va). El anfitrion tambien puede jugar: entonces ve las dos cosas.
 */
export default function PortfolioRoomScreen() {
  useKeepAwake()
  const toast = useToast()
  const code = String(useLocalSearchParams<{ code: string }>().code ?? "").toUpperCase()
  const { view, connection, apply } = useLiveRoom<PortfolioGameView>(`/portfolio-rooms/${code}/events`)
  const navigation = useNavigation()

  const act = useAsyncAction(async (run: () => Promise<PortfolioGameView>) => {
    try {
      apply(await run())
    } catch (error) {
      toast(userMessage(toApiError(error)))
    }
  })

  // Solo el anfitrion revela los semestres: si sale a mitad de la simulacion, todos se quedan esperando.
  usePreventRemove(Boolean(view?.host) && view?.phase === "RUNNING", ({ data }) => {
    void confirmAction({
      title: "¿Salir de la sala?",
      message: "Eres el anfitrión: la simulación queda en pausa hasta que vuelvas a entrar con el código.",
      confirmLabel: "Salir",
    }).then((ok) => {
      if (ok) navigation.dispatch(data.action)
    })
  })

  // Al revelar un semestre, una vibracion corta dice si tu portafolio subio o bajo (una vez por etapa).
  const felt = useRef(0)
  const step = view?.phase === "RUNNING" && view.me?.result ? view.step : 0
  const up = (view?.me?.result?.lastPercent ?? 0) >= 0
  useEffect(() => {
    if (!step || felt.current === step) return
    felt.current = step
    if (up) haptics.success()
    else haptics.warning()
  }, [step, up])

  const cancel = async () => {
    const ok = await confirmAction({ title: "¿Cerrar la sala?", message: "Termina el juego para todos los que están dentro.", confirmLabel: "Cerrar sala", destructive: true })
    if (!ok) return
    try {
      await portfolioGameService.cancel(code)
      router.back()
    } catch (error) {
      toast(userMessage(toApiError(error)))
    }
  }

  if (!view) {
    if (connection === "missing") return <Gone title="No encontramos esta sala" />
    return (
      <Screen back title={TITLE} subtitle={`Sala ${code}`}>
        <Skeleton height={220} />
      </Screen>
    )
  }
  if (view.phase === "CANCELLED") return <Gone title="El anfitrión cerró la sala" />

  const status = [`Sala ${view.code}`, view.phase === "RUNNING" ? `Semestre ${view.step} de ${view.totalSteps}` : null, connection === "reconnecting" ? "Reconectando…" : null]
    .filter(Boolean)
    .join(" · ")

  return (
    <Screen back title={TITLE} subtitle={status}>
      {view.phase === "LOBBY" ? (
        <>
          {/* El jugador ve con quien esta y cuanto falta para empezar. */}
          {view.me && !view.host ? <RoomPulse view={view} /> : null}
          {/* Si el anfitrion tambien juega, primero arma su portafolio y despues maneja la sala. */}
          {view.me ? (
            <AllocationEditor
              view={view}
              busy={act.isPending}
              onReady={(weights) => act.run(() => portfolioGameService.allocate(code, weights))}
              onEdit={() => act.run(() => portfolioGameService.unready(code))}
            />
          ) : view.host ? null : (
            <JoinCard busy={act.isPending} onJoin={() => act.run(() => portfolioGameService.join(code))} />
          )}
          {view.host ? <HostLobby view={view} busy={act.isPending} onJoin={() => act.run(() => portfolioGameService.join(code))} onStart={() => act.run(() => portfolioGameService.start(code))} onCancel={() => void cancel()} /> : null}
        </>
      ) : (
        <Simulation view={view} busy={act.isPending} onNext={() => act.run(() => portfolioGameService.next(code))} />
      )}
    </Screen>
  )
}

function HostLobby({ view, busy, onJoin, onStart, onCancel }: { view: PortfolioGameView; busy: boolean; onJoin: () => void; onStart: () => void; onCancel: () => void }) {
  const colors = usePalette()
  const colorOf = useSectorColor()
  const ready = view.ranking.filter((player) => player.ready).length
  return (
    <>
      <RoomCodeCard game="portfolio" code={view.code} />
      <Card className="gap-2.5">
        <Text weight="medium" className="text-sm">Portafolios listos · {ready} de {view.ranking.length}</Text>
        {view.ranking.length === 0 ? (
          <Text tone="muted" className="text-sm">Todavía no entra nadie. Cuando escaneen el QR o pongan el código, van a aparecer aquí.</Text>
        ) : (
          view.ranking.map((player) => (
            <View key={player.id} className="min-h-9 flex-row items-center gap-2">
              <Text weight="medium" numberOfLines={1} className="flex-1 text-sm">{player.name}{player.me ? " (tú)" : ""}</Text>
              {player.ready ? (
                <View className="flex-row items-center gap-1">
                  <Check size={14} color={colors.gain} />
                  <Text tone="gain" className="text-xs">Listo</Text>
                </View>
              ) : (
                <Text tone="muted" className="text-xs">Armando…</Text>
              )}
            </View>
          ))
        )}
        {ready > 0 && ready < view.ranking.length ? <Text tone="muted" className="text-xs">Quien no esté listo al empezar queda fuera y puede mirar.</Text> : null}
      </Card>
      <Card className="gap-2">
        <Text weight="medium" className="text-sm">Los 8 sectores</Text>
        {view.sectors.map((sector) => (
          <View key={sector.key} className="flex-row gap-2.5">
            <View className="mt-1.5 size-2.5 rounded-full" style={{ backgroundColor: colorOf(sector.key) }} />
            <Text tone="muted" className="flex-1 text-[13px] leading-5">
              <Text weight="medium" className="text-[13px]">{sector.name}</Text> · {sector.description}
            </Text>
          </View>
        ))}
      </Card>
      <Card className="gap-2">
        <Text weight="medium" className="text-sm">Cómo se juega</Text>
        {PORTFOLIO_GAME_RULES.map((rule) => (
          <Text key={rule} tone="muted" className="text-[13px] leading-5">• {rule}</Text>
        ))}
      </Card>
      {!view.me ? <Button label="Jugar yo también" variant="outline" loading={busy} onPress={onJoin} /> : null}
      <Button
        label={view.me && !view.me.ready ? "Empezar (tu portafolio no está listo)" : "Empezar la simulación"}
        disabled={ready === 0}
        loading={busy}
        onPress={onStart}
      />
      <Button label="Cerrar sala" variant="outline" onPress={onCancel} />
    </>
  )
}

function RoomPulse({ view }: { view: PortfolioGameView }) {
  const ready = view.ranking.filter((player) => player.ready).length
  return (
    <Text tone="muted" className="text-sm">
      {view.ranking.length} {view.ranking.length === 1 ? "jugador" : "jugadores"} en la sala · {ready} {ready === 1 ? "listo" : "listos"}
    </Text>
  )
}

function JoinCard({ busy, onJoin }: { busy: boolean; onJoin: () => void }) {
  return (
    <Card className="gap-3">
      <Title size="md">{TITLE}</Title>
      <Text tone="muted" className="text-sm leading-5">Reparte tu dinero entre 8 sectores y mira cómo le va en cinco semestres reales del mercado.</Text>
      <Button label="Entrar a la sala" loading={busy} onPress={onJoin} />
      <Text tone="muted" className="text-xs">Es gratis: se juegan puntos de la sala, no fichas.</Text>
    </Card>
  )
}

function Simulation({ view, busy, onNext }: { view: PortfolioGameView; busy: boolean; onNext: () => void }) {
  const finished = view.phase === "FINISHED"
  const stage = view.stages[view.step - 1]
  const me = view.me?.result ? view.me : null
  const lesson = finished ? finalLesson(view.ranking) : null

  return (
    <>
      {finished ? (
        <Card className="gap-2">
          <Title size="lg">{me ? `Terminaste #${me.rank}` : "La simulación terminó"}</Title>
          {me?.result ? (
            <Text tone="muted" className="text-sm">
              de {view.ranking.length}, con {formatGamePoints(me.result.value)} puntos ({formatChange(me.result.returnPercent)}).
            </Text>
          ) : null}
          {lesson ? <Text weight="medium" className="rounded-2xl bg-accent p-3 text-sm leading-5">{lesson}</Text> : null}
        </Card>
      ) : me ? (
        <MyRun view={view} />
      ) : (
        <Card className="gap-1">
          <Text weight="semibold" className="text-base">{view.host ? "Estás conduciendo la simulación" : "La simulación empezó sin tu portafolio"}</Text>
          <Text tone="muted" className="text-sm">{view.host ? "Revela cada semestre cuando la sala termine de leerlo." : "No alcanzaste a dejarlo listo, pero puedes seguir la tabla."}</Text>
        </Card>
      )}

      {stage && !finished ? (
        <Card className="gap-3">
          <View className="gap-1">
            <Text tone="muted" className="text-xs">Semestre {stage.number} · {stage.period}</Text>
            <Text weight="semibold" className="text-base leading-6">{stage.title}</Text>
            <Text tone="muted" className="text-[13px] leading-5">{stage.lesson}</Text>
          </View>
          <SectorReturns sectors={view.sectors} returns={stage.returns ?? {}} />
          {stage.benchmarkReturn !== null ? (
            <Text tone="muted" className="text-sm">
              El S&P 500 rindió <Text tone={stage.benchmarkReturn >= 0 ? "gain" : "loss"} className="text-sm">{formatChange(stage.benchmarkReturn)}</Text> en el semestre.
            </Text>
          ) : null}
        </Card>
      ) : null}

      <Card className="gap-2 px-2">
        <Text weight="medium" className="px-2 text-sm">
          {finished ? "Resultado final" : view.step < 2 ? "Tabla · con un semestre todavía no hay riesgo que medir" : "Tabla en vivo · ordena el puntaje"}
        </Text>
        <PortfolioBoard ranking={view.ranking} sectors={view.sectors} benchmark={view.benchmark} />
        <Text tone="muted" className="px-2 text-xs leading-4">Puntaje: retorno promedio por semestre dividido entre el riesgo (cuánto varió de un semestre a otro).</Text>
      </Card>

      {view.host && !finished ? (
        <Button label={view.step + 1 === view.totalSteps ? "Revelar el último semestre" : "Siguiente semestre"} loading={busy} onPress={onNext} />
      ) : !finished && me ? (
        <Text tone="muted" className="text-center text-sm">El siguiente semestre lo revela el anfitrión.</Text>
      ) : null}
      {finished ? <Button label="Volver a minijuegos" variant="outline" onPress={() => router.back()} /> : null}
    </>
  )
}

function MyRun({ view }: { view: PortfolioGameView }) {
  const colorOf = useSectorColor()
  const me = view.me!
  const result = me.result!
  const stage = view.stages[view.step - 1]
  const movers = contributions(me.weights ?? {}, stage?.returns ?? {})
  const names = Object.fromEntries(view.sectors.map((sector) => [sector.key, sector.name]))
  return (
    <Card className="gap-2">
      <Text tone="muted" className="text-sm">Tu portafolio vale</Text>
      <Text weight="semibold" className="text-4xl" style={{ fontVariant: ["tabular-nums"] }}>{formatGamePoints(result.value)} pts</Text>
      <Text className="text-sm">
        <Text tone={result.returnPercent >= 0 ? "gain" : "loss"} className="text-sm">{formatChange(result.returnPercent)}</Text> en total · puesto {me.rank} de {view.ranking.length}
      </Text>
      <MixBar weights={me.weights ?? {}} sectors={view.sectors} />
      <Text className="mt-1 text-sm">
        Este semestre rendiste <Text weight="semibold" tone={result.lastPercent >= 0 ? "gain" : "loss"} className="text-sm">{formatChange(result.lastPercent)}</Text>. Lo que más pesó:
      </Text>
      {movers.map((mover) => (
        <View key={mover.key} className="flex-row items-center gap-2">
          <View className="size-2 rounded-full" style={{ backgroundColor: colorOf(mover.key) }} />
          <Text className="flex-1 text-sm">{names[mover.key]} <Text tone="muted" className="text-sm">({mover.weight} %)</Text></Text>
          <Text tone={mover.effect >= 0 ? "gain" : "loss"} className="text-sm" style={{ fontVariant: ["tabular-nums"] }}>{formatChange(mover.effect)}</Text>
        </View>
      ))}
    </Card>
  )
}

function Gone({ title }: { title: string }) {
  return (
    <Screen back title={TITLE}>
      <EmptyState
        icon={SearchX}
        title={title}
        message="Puede que el código esté mal, que la sala se haya cerrado o que el juego haya terminado hace rato."
        action={{ label: "Volver a minijuegos", onPress: () => router.back() }}
      />
    </Screen>
  )
}
