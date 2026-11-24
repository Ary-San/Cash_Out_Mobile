import { useState } from "react"
import { Pressable, View } from "react-native"
import { router } from "expo-router"
import { ChartPie, Flag, ScanLine, TrendingUp, type LucideIcon } from "lucide-react-native"
import { toApiError, userMessage } from "@/api/errors"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Field } from "@/components/ui/Field"
import { Screen } from "@/components/ui/Screen"
import { Text } from "@/components/ui/Text"
import { useToast } from "@/components/ui/Toast"
import { useAsyncAction } from "@/hooks/useAsyncAction"
import { ROOM_CODE_LENGTH, ROOM_GAMES, findRoomGame, normalizeRoomCode, type RoomGame } from "@/lib/rooms"
import { RACE_FEES } from "@/lib/race"
import { TOUCH_SLOP } from "@/lib/touch"
import { portfolioGameService } from "@/services/portfolioGameService"
import { raceService } from "@/services/raceService"
import { updownService } from "@/services/updownService"
import { PracticeGames } from "@/components/minigames/PracticeGames"
import { usePalette } from "@/theme/palette"

const GAMES: { game: RoomGame; icon: LucideIcon; pitch: string; detail: string; create: (fee: number) => Promise<{ code: string }> }[] = [
  {
    game: "updown",
    icon: TrendingUp,
    pitch: "Noticias reales: apuesta qué hizo el mercado el mes siguiente.",
    detail: "8 rondas de 20 segundos. Empiezas con 1000 puntos y apuestas lo que quieras.",
    create: updownService.create,
  },
  {
    game: "portfolio",
    icon: ChartPie,
    pitch: "Reparte tu dinero entre 8 sectores y míralo pasar por 5 semestres reales.",
    detail: "Gana el mejor rendimiento ajustado por riesgo, no el que más arriesga.",
    create: portfolioGameService.create,
  },
  {
    game: "race",
    icon: Flag,
    pitch: "Todos operan la misma moneda misteriosa en un día real del mercado cripto.",
    detail: "Seis horas de mercado en 90 segundos. El podio se reparte el pozo 50 / 30 / 20.",
    create: raceService.create,
  },
]

/**
 * Minijuegos en grupo: crear una sala (este celular es el anfitrion) o entrar a
 * una con el codigo o el QR. Las salas son las mismas de la web: celulares y
 * laptops juegan juntos.
 */
export default function GamesScreen() {
  const colors = usePalette()
  const toast = useToast()
  const [code, setCode] = useState("")
  const [error, setError] = useState<string>()
  const [creating, setCreating] = useState<RoomGame | null>(null)
  // La carrera se crea con una cuota en fichas; gratis es para practicar.
  const [fee, setFee] = useState<number>(0)

  const create = useAsyncAction(async (game: RoomGame) => {
    setCreating(game)
    try {
      const room = await GAMES.find((item) => item.game === game)!.create(fee)
      router.push({ pathname: ROOM_GAMES[game].screen, params: { code: room.code } })
    } catch (err) {
      toast(userMessage(toApiError(err)))
    } finally {
      setCreating(null)
    }
  })

  // Con el codigo solo no se sabe el juego: se busca la sala antes de entrar.
  const join = useAsyncAction(async () => {
    if (code.length !== ROOM_CODE_LENGTH) return setError(`El código tiene ${ROOM_CODE_LENGTH} letras y números.`)
    try {
      const game = await findRoomGame(code)
      if (!game) return setError("No encontramos una sala con ese código. Revísalo o pídele el QR a quien la creó.")
      router.push({ pathname: ROOM_GAMES[game].screen, params: { code } })
    } catch (err) {
      setError(userMessage(toApiError(err)))
    }
  })

  return (
    <Screen title="Minijuegos" subtitle="Aprende jugando con tu grupo, desde el celular o la laptop">
      <Card className="gap-3">
        <Text weight="semibold" className="text-base">Entrar a una sala</Text>
        <Field
          label="Código de la sala"
          value={code}
          onChangeText={(value) => {
            setCode(normalizeRoomCode(value))
            setError(undefined)
          }}
          placeholder="Por ejemplo: K7M2QX"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={ROOM_CODE_LENGTH + 2}
          returnKeyType="go"
          onSubmitEditing={() => void join.run()}
          error={error}
        />
        <Button label="Entrar" disabled={code.length === 0} loading={join.isPending} onPress={() => void join.run()} />
        <Button label="Escanear el QR de la sala" variant="outline" onPress={() => router.push("/games/scan")} />
        <View className="flex-row items-center gap-1.5">
          <ScanLine size={14} color={colors.mutedForeground} />
          <Text tone="muted" className="flex-1 text-xs">El QR lo muestra quien creó la sala, en su celular o en la pantalla de la laptop.</Text>
        </View>
      </Card>

      <Text weight="medium" tone="muted" className="px-1 text-[11px] uppercase tracking-widest">Crear una sala</Text>
      {GAMES.map(({ game, icon: Icon, pitch, detail }) => (
        <Card key={game} className="gap-3">
          <View className="flex-row items-center gap-3">
            <View className="size-11 items-center justify-center rounded-xl bg-accent">
              <Icon size={22} color={colors.accentInk} />
            </View>
            <View className="flex-1">
              <Text weight="semibold" className="text-base">{ROOM_GAMES[game].name}</Text>
              <Text tone="muted" className="text-[13px] leading-5">{pitch}</Text>
            </View>
          </View>
          <Text tone="muted" className="text-[13px] leading-5">{detail}</Text>
          {game === "race" ? <FeePicker fee={fee} onChange={setFee} /> : null}
          <Button label="Crear sala" variant="outline" loading={creating === game} disabled={creating !== null && creating !== game} onPress={() => void create.run(game)} />
        </Card>
      ))}
      <Text tone="muted" className="px-1 text-xs">Quien crea la sala la maneja desde su celular; los demás entran con el código o el QR.</Text>

      <Text weight="medium" tone="muted" className="px-1 text-[11px] uppercase tracking-widest">Para practicar solo</Text>
      <PracticeGames />
    </Screen>
  )
}

function FeePicker({ fee, onChange }: { fee: number; onChange: (fee: number) => void }) {
  return (
    <View className="gap-1.5">
      <Text weight="medium" className="text-sm">Cuota de entrada</Text>
      <View role="radiogroup" aria-label="Cuota de entrada" className="flex-row gap-2">
        {RACE_FEES.map((option) => {
          const on = fee === option
          return (
            <Pressable
              key={option}
              hitSlop={TOUCH_SLOP}
              role="radio"
              aria-checked={on}
              onPress={() => onChange(option)}
              className={`min-h-9 flex-1 items-center justify-center rounded-full border ${on ? "border-accent-ink bg-accent" : "border-border"}`}
            >
              <Text weight={on ? "semibold" : "regular"} className="text-[13px]">{option === 0 ? "Gratis" : `${option}`}</Text>
            </Pressable>
          )
        })}
      </View>
      <Text tone="muted" className="text-xs">{fee === 0 ? "Sin cuota no hay pozo: es para practicar." : `${fee} fichas por jugador. Las cuotas forman el pozo del podio.`}</Text>
    </View>
  )
}
