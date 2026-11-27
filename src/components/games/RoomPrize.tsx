import { View } from "react-native"
import { Text } from "@/components/ui/Text"
import { formatTokens } from "@/lib/market"
import { ROOM_PODIUM, ROOM_PRIZE_MIN_PLAYERS } from "@/lib/rooms"

/** Lo que gano el jugador al terminar una sala por puntos: el podio cobra fichas si jugaron al menos dos. */
export function RoomPrize({ prize, players }: { prize: number; players: number }) {
  const alone = players < ROOM_PRIZE_MIN_PLAYERS
  return (
    <View className="items-center gap-1 rounded-xl border border-border p-4">
      <Text tone="muted" className="text-center text-sm">
        {prize > 0
          ? "Ganaste por tu puesto"
          : alone
            ? `Jugaste solo: el podio gana fichas desde ${ROOM_PRIZE_MIN_PLAYERS} jugadores`
            : `Esta vez no entraste al podio (${ROOM_PODIUM.join(" / ")} fichas)`}
      </Text>
      <Text weight="semibold" tone={prize > 0 ? "gain" : "default"} className="text-2xl" style={{ fontVariant: ["tabular-nums"] }}>
        {prize > 0 ? `+${formatTokens(prize)}` : "0 fichas"}
      </Text>
    </View>
  )
}
