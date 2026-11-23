import { memo, useEffect, useRef, useState } from "react"
import { Pressable, View } from "react-native"
import { router, useLocalSearchParams, useNavigation, usePreventRemove } from "expo-router"
import { useKeepAwake } from "expo-keep-awake"
import { SearchX } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { toApiError, userMessage } from "@/api/errors"
import { RoomCodeCard } from "@/components/games/RoomCodeCard"
import { RaceChart, RaceRanking } from "@/components/race/RaceBoards"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Screen } from "@/components/ui/Screen"
import { EmptyState, Skeleton } from "@/components/ui/States"
import { Text, Title } from "@/components/ui/Text"
import { useToast } from "@/components/ui/Toast"
import { useAsyncAction } from "@/hooks/useAsyncAction"
import { useLiveRoom } from "@/hooks/useLiveRoom"
import { confirmWithBiometrics } from "@/lib/biometrics"
import { confirmAction } from "@/lib/confirm"
import { haptics } from "@/lib/haptics"
import { formatSignedPercent, formatTokens, formatUsd } from "@/lib/market"
import { RACE_FRACTIONS, RACE_RULES, formatRaceDate, mergeRaceView, raceRefunded } from "@/lib/race"
import { TOUCH_SLOP } from "@/lib/touch"
import { raceService } from "@/services/raceService"
import type { RaceSide, RaceView } from "@/types/race"
import { usePalette } from "@/theme/palette"

const TITLE = "Carrera de trading"
const points = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 })
const price2 = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * Una sala de la carrera. La misma pantalla sirve al anfitrion (codigo, QR, pozo,
 * empezar o cancelar) y al jugador (comprar y vender en vivo). El anfitrion
 * tambien puede correr: entonces ve las dos cosas.
 */
export default function RaceRoomScreen() {
  useKeepAwake()
  const toast = useToast()
  const code = String(useLocalSearchParams<{ code: string }>().code ?? "").toUpperCase()
  // Los ticks (4 por segundo) traen solo el precio del paso: se suma a la serie que ya se tenia.
  const { view, connection, apply } = useLiveRoom<RaceView>(`/race-rooms/${code}/events`, mergeRaceView)
  const navigation = useNavigation()

  // La carrera es de 90 segundos y corre sola: salir a mitad deja de operar, pero no la detiene.
  const racing = Boolean(view?.me) && (view?.phase === "COUNTDOWN" || view?.phase === "RUNNING")
  // Quien ya pago no recupera la cuota por salir: no hay "salir de la sala" en el backend.
  const paidWaiting = Boolean(view?.joined) && !view?.host && view?.phase === "LOBBY" && (view?.entryFee ?? 0) > 0
  usePreventRemove(racing || paidWaiting, ({ data }) => {
    void confirmAction({
      title: racing ? "¿Salir de la carrera?" : "¿Salir de la sala?",
      message: racing
        ? "La carrera sigue sin ti: lo que tengas invertido se queda como está hasta el final."
        : "Tu cuota ya está en el pozo y sigues inscrito: puedes volver con el código antes de que empiece.",
      confirmLabel: "Salir",
    }).then((ok) => {
      if (ok) navigation.dispatch(data.action)
    })
  })

  // Al arrancar, una vibracion corta: quien mira la laptop sabe que ya puede operar.
  const started = useRef(false)
  const running = view?.phase === "RUNNING" && Boolean(view.me)
  useEffect(() => {
    if (!running || started.current) return
    started.current = true
    haptics.selection()
  }, [running])

  // Al terminar, una vibracion dice si ganaste del pozo (una vez).
  const felt = useRef(false)
  const finished = view?.phase === "FINISHED" && Boolean(view.me)
  const won = (view?.me?.prize ?? 0) > 0
  useEffect(() => {
    if (!finished || felt.current) return
    felt.current = true
    if (won) haptics.success()
  }, [finished, won])

  const join = useAsyncAction(async (room: RaceView) => {
    // La cuota es en fichas de verdad: se confirma el monto y, con la biometria activa, con la huella.
    if (room.entryFee > 0) {
      const ok = await confirmAction({
        title: `¿Entrar por ${formatTokens(room.entryFee)}?`,
        message: "La cuota va al pozo que se reparte el podio. Si al final son menos de 3 jugadores, te la devolvemos.",
        confirmLabel: "Pagar y entrar",
      })
      if (!ok || !(await confirmWithBiometrics("Confirma la cuota de la carrera"))) return
    }
    try {
      apply(await raceService.join(code))
      haptics.success()
    } catch (error) {
      toast(userMessage(toApiError(error)))
    }
  })
  const start = useAsyncAction(async () => {
    try {
      apply(await raceService.start(code))
    } catch (error) {
      toast(userMessage(toApiError(error)))
    }
  })
  const cancel = async () => {
    const ok = await confirmAction({ title: "¿Cancelar la sala?", message: "Se devuelve la cuota a todos los que entraron.", confirmLabel: "Cancelar sala", destructive: true })
    if (!ok) return
    try {
      await raceService.cancel(code)
      router.back()
    } catch (error) {
      toast(userMessage(toApiError(error)))
    }
  }

  if (!view) {
    if (connection === "missing") return <Gone title="No encontramos esta sala" message="Puede que el código esté mal, que la sala se haya cancelado o que la carrera haya terminado hace rato." />
    return (
      <Screen back title={TITLE} subtitle={`Sala ${code}`}>
        <Skeleton height={220} />
      </Screen>
    )
  }
  if (view.phase === "CANCELLED") return <Gone title="La sala se canceló" message="Si pagaste cuota, ya te la devolvimos." />

  const status = [`Sala ${view.code}`, `Pozo ${formatTokens(view.pot)}`, connection === "reconnecting" ? "Reconectando…" : null].filter(Boolean).join(" · ")

  return (
    <Screen back title={TITLE} subtitle={status}>
      {view.phase === "LOBBY" ? (
        <Lobby view={view} joining={join.isPending} starting={start.isPending} onJoin={() => void join.run(view)} onStart={() => void start.run()} onCancel={() => void cancel()} />
      ) : view.phase === "COUNTDOWN" ? (
        <Card role="status" className="items-center gap-1 py-10">
          <Text tone="muted" className="text-sm">La carrera empieza en</Text>
          <Title size="xl" className="text-accent-ink" style={{ fontSize: 96, lineHeight: 100 }}>{view.countdown}</Title>
        </Card>
      ) : view.phase === "FINISHED" ? (
        <Result view={view} />
      ) : view.me ? (
        <Trading view={view} code={code} apply={apply} />
      ) : (
        <Card className="gap-3">
          <Text weight="semibold" className="text-base">{view.host ? "La carrera está en marcha" : "La carrera ya empezó"}</Text>
          {view.host ? null : <Text tone="muted" className="text-sm">Ya no se puede entrar, pero puedes mirarla.</Text>}
          <RaceChart prices={view.prices ?? []} totalSteps={view.totalSteps} height={140} />
          <RaceRanking ranking={view.ranking} showInvested={view.host} />
        </Card>
      )}
    </Screen>
  )
}

interface LobbyProps {
  view: RaceView
  joining: boolean
  starting: boolean
  onJoin: () => void
  onStart: () => void
  onCancel: () => void
}

function Lobby({ view, joining, starting, onJoin, onStart, onCancel }: LobbyProps) {
  const facts = (
    <Card className="gap-2">
      <Fact label="Cuota" value={view.entryFee > 0 ? formatTokens(view.entryFee) : "Gratis"} />
      <Fact label="Pozo" value={formatTokens(view.pot)} />
      <Fact label="Jugadores" value={`${view.ranking.length} de ${view.maxPlayers}`} />
    </Card>
  )
  const joinButton = !view.joined ? (
    <>
      <Button
        label={view.entryFee > 0 ? `${view.host ? "Correr yo también" : "Entrar"} por ${formatTokens(view.entryFee)}` : view.host ? "Correr yo también" : "Entrar gratis"}
        variant={view.host ? "outline" : "primary"}
        loading={joining}
        onPress={onJoin}
      />
      {view.entryFee > 0 ? <Text tone="muted" className="-mt-2 text-xs">Si al final son menos de 3 jugadores, te devolvemos la cuota.</Text> : null}
    </>
  ) : null

  if (!view.host) {
    return (
      <>
        <Card className="gap-2">
          <Title size="md">{view.joined ? "Ya estás dentro" : TITLE}</Title>
          <Text tone="muted" className="text-sm leading-5">
            {view.joined
              ? "Cuando el anfitrión empiece, vas a ver la moneda misteriosa y tus botones para comprar y vender."
              : "Entra antes de que empiece. Todos arrancan con 10 000 puntos."}
          </Text>
          {view.joined ? <Text tone="accent" weight="medium" className="text-sm">Esperando al anfitrión…</Text> : null}
          {view.joined && view.entryFee > 0 ? (
            <Text tone="muted" className="text-xs leading-4">Tu cuota ya está en el pozo. Si el anfitrión cancela o al final son menos de 3, te la devolvemos.</Text>
          ) : null}
        </Card>
        {facts}
        {joinButton}
      </>
    )
  }
  return (
    <>
      <RoomCodeCard game="race" code={view.code} />
      {facts}
      <Card className="gap-2">
        <Text weight="medium" className="text-sm">En la sala</Text>
        {view.ranking.length === 0 ? (
          <Text tone="muted" className="text-sm">Todavía no entra nadie. Cuando escaneen el QR o pongan el código, van a aparecer aquí.</Text>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {view.ranking.map((racer) => (
              <View key={racer.id} className="min-h-9 flex-row items-center rounded-full bg-muted px-3">
                <Text weight="medium" className="text-sm">{racer.name}{racer.me ? " (tú)" : ""}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
      <Card className="gap-2">
        <Text weight="medium" className="text-sm">Cómo se juega</Text>
        {RACE_RULES.map((rule) => (
          <Text key={rule} tone="muted" className="text-[13px] leading-5">• {rule}</Text>
        ))}
      </Card>
      {joinButton}
      <Button label="Empezar la carrera" disabled={view.ranking.length === 0} loading={starting} onPress={onStart} />
      <Button label="Cancelar sala" variant="outline" onPress={onCancel} />
    </>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between">
      <Text tone="muted" className="text-sm">{label}</Text>
      <Text weight="medium" className="text-sm">{value}</Text>
    </View>
  )
}

function Trading({ view, code, apply }: { view: RaceView; code: string; apply: (next: RaceView) => void }) {
  const toast = useToast()
  const me = view.me!
  const [fraction, setFraction] = useState<number>(0.5)
  const [lastAction, setLastAction] = useState("")
  const change = view.price - 100
  const canBuy = me.cash >= 0.01
  const canSell = me.investedPercent > 0

  const trade = useAsyncAction(async (side: RaceSide) => {
    try {
      const next = await raceService.trade(code, side, fraction)
      apply(next)
      haptics.selection()
      const share = RACE_FRACTIONS.find((option) => option.value === fraction)!.label.toLowerCase()
      setLastAction(`${side === "BUY" ? "Compraste" : "Vendiste"} ${share} a ${price2.format(next.price)}`)
    } catch (error) {
      toast(userMessage(toApiError(error)))
    }
  })

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <Text tone="muted" className="text-sm">Minuto {view.step + 1} de {view.totalSteps}</Text>
        <View className="rounded-full bg-accent px-2.5 py-1">
          <Text weight="medium" className="text-sm">#{me.rank} de {view.ranking.length}</Text>
        </View>
      </View>

      <View>
        <Text tone="muted" className="text-xs">Moneda misteriosa</Text>
        <View className="flex-row items-baseline gap-2">
          <Text weight="semibold" className="text-4xl" style={{ fontVariant: ["tabular-nums"] }}>{price2.format(view.price)}</Text>
          <Text weight="medium" tone={change >= 0 ? "gain" : "loss"} className="text-sm">{formatSignedPercent(change)}</Text>
        </View>
      </View>

      <RaceChart prices={view.prices ?? []} totalSteps={view.totalSteps} height={120} />

      <Card className="gap-2">
        <View className="flex-row items-baseline justify-between">
          <Text tone="muted" className="text-sm">Tu capital</Text>
          <Text weight="medium" tone={me.returnPercent >= 0 ? "gain" : "loss"} className="text-sm" style={{ fontVariant: ["tabular-nums"] }}>{formatSignedPercent(me.returnPercent)}</Text>
        </View>
        <Text weight="semibold" className="text-3xl" style={{ fontVariant: ["tabular-nums"] }}>{points.format(me.value)} pts</Text>
        <View className="h-2 overflow-hidden rounded-full bg-muted">
          <View className="h-full rounded-full bg-accent-ink" style={{ width: `${me.investedPercent}%` }} />
        </View>
        <View className="flex-row justify-between">
          <Text tone="muted" className="text-xs">Invertido {Math.round(me.investedPercent)} %</Text>
          <Text tone="muted" className="text-xs">Efectivo {Math.round(100 - me.investedPercent)} %</Text>
        </View>
      </Card>

      <TradeControls fraction={fraction} onFraction={setFraction} onTrade={trade.run} busy={trade.isPending} canBuy={canBuy} canSell={canSell} />
      <Text role="status" tone="muted" className="min-h-5 text-center text-sm">{lastAction || "Elige cuánto y toca Comprar o Vender."}</Text>

      <Card className="gap-2 px-2">
        <Text weight="medium" className="px-2 text-sm">Ranking</Text>
        <RaceRanking ranking={view.ranking} limit={5} />
      </Card>
    </View>
  )
}

interface TradeControlsProps {
  fraction: number
  onFraction: (value: number) => void
  onTrade: (side: RaceSide) => unknown
  busy: boolean
  canBuy: boolean
  canSell: boolean
}

/**
 * Cuanto y comprar o vender. Va aparte y memorizado: la carrera manda 4 estados
 * por segundo, y los botones solo cambian cuando cambia lo que se puede hacer.
 */
const TradeControls = memo(function TradeControls({ fraction, onFraction, onTrade, busy, canBuy, canSell }: TradeControlsProps) {
  const colors = usePalette()
  const { colorScheme } = useColorScheme()
  // En oscuro el verde y el rojo son claros: el texto blanco no llega a 4.5:1, el fondo oscuro si.
  const ink = colorScheme === "dark" ? colors.background : "#ffffff"
  return (
    <>
      <View role="radiogroup" aria-label="Cuánto comprar o vender" className="flex-row gap-2">
        {RACE_FRACTIONS.map((option) => {
          const on = fraction === option.value
          return (
            <Pressable
              key={option.label}
              hitSlop={TOUCH_SLOP}
              role="radio"
              aria-checked={on}
              onPress={() => onFraction(option.value)}
              className={`min-h-11 flex-1 items-center justify-center rounded-xl border ${on ? "border-accent-ink bg-accent" : "border-border"}`}
            >
              <Text weight={on ? "semibold" : "regular"} className="text-sm">{option.label}</Text>
            </Pressable>
          )
        })}
      </View>

      <View className="flex-row gap-3">
        <Pressable
          role="button"
          aria-disabled={busy || !canBuy}
          disabled={busy || !canBuy}
          onPress={() => void onTrade("BUY")}
          className={`min-h-14 flex-1 items-center justify-center rounded-xl active:opacity-80 ${busy || !canBuy ? "opacity-40" : ""}`}
          style={{ backgroundColor: colors.gain }}
        >
          <Text weight="semibold" className="text-base" style={{ color: ink }}>Comprar</Text>
        </Pressable>
        <Pressable
          role="button"
          aria-disabled={busy || !canSell}
          disabled={busy || !canSell}
          onPress={() => void onTrade("SELL")}
          className={`min-h-14 flex-1 items-center justify-center rounded-xl active:opacity-80 ${busy || !canSell ? "opacity-40" : ""}`}
          style={{ backgroundColor: colors.loss }}
        >
          <Text weight="semibold" className="text-base" style={{ color: ink }}>Vender</Text>
        </Pressable>
      </View>
    </>
  )
})

function Result({ view }: { view: RaceView }) {
  const me = view.me
  const scenario = view.scenario
  const refunded = raceRefunded(view)
  const realChange = scenario ? (scenario.realClose / scenario.realOpen - 1) * 100 : null

  return (
    <>
      <Card className="gap-3">
        <Title size="lg">{me ? `Terminaste #${me.rank}` : "La carrera terminó"}</Title>
        {me ? (
          <>
            <Text tone="muted" className="text-sm">
              de {view.ranking.length} jugadores, con <Text tone={me.returnPercent >= 0 ? "gain" : "loss"} className="text-sm">{formatSignedPercent(me.returnPercent)}</Text>.
            </Text>
            <View className="items-center gap-1 rounded-xl border border-border p-4">
              <Text tone="muted" className="text-center text-sm">
                {me.prize > 0 ? "Ganaste del pozo" : refunded ? "Eran menos de 3 jugadores: te devolvimos la cuota" : view.entryFee === 0 ? "Sala gratis: no había pozo" : "Esta vez no entraste al podio"}
              </Text>
              <Text weight="semibold" tone={me.prize > 0 ? "gain" : "default"} className="text-2xl">
                {me.prize > 0 ? `+${formatTokens(me.prize)}` : refunded ? formatTokens(view.entryFee) : "0 fichas"}
              </Text>
            </View>
          </>
        ) : null}
        <RaceRanking ranking={view.ranking} />
      </Card>

      {scenario ? (
        <Card className="gap-2">
          <Text tone="muted" className="text-sm">La moneda misteriosa era…</Text>
          <Title size="md">{scenario.coinName}, el {formatRaceDate(scenario.date)}</Title>
          <Text weight="medium" className="text-sm">{scenario.title}</Text>
          <Text tone="muted" className="text-sm leading-5">{scenario.description}</Text>
          <Text tone="muted" className="text-sm">
            En esas 6 horas pasó de {formatUsd(scenario.realOpen)} a {formatUsd(scenario.realClose)} (
            <Text tone={(realChange ?? 0) >= 0 ? "gain" : "loss"} className="text-sm">{formatSignedPercent(realChange)}</Text>).
          </Text>
        </Card>
      ) : null}

      <Button label="Volver a minijuegos" variant="outline" onPress={() => router.back()} />
      {me ? <Button label="Invertir mis fichas" onPress={() => router.navigate("/portfolio")} /> : null}
    </>
  )
}

function Gone({ title, message }: { title: string; message: string }) {
  return (
    <Screen back title={TITLE}>
      <EmptyState icon={SearchX} title={title} message={message} action={{ label: "Volver a minijuegos", onPress: () => router.back() }} />
    </Screen>
  )
}
