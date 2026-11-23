import { Share, View } from "react-native"
import QRCode from "react-native-qrcode-svg"
import { Share2 } from "lucide-react-native"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Text } from "@/components/ui/Text"
import { ROOM_GAMES, roomJoinUrl, type RoomGame } from "@/lib/rooms"
import { usePalette } from "@/theme/palette"

/**
 * Como se entra a la sala: el QR abre la sala en la web (laptop o celular sin la
 * app) y la app lo reconoce al escanearlo; el codigo se puede dictar o compartir.
 */
export function RoomCodeCard({ game, code }: { game: RoomGame; code: string }) {
  const colors = usePalette()
  const url = roomJoinUrl(game, code)

  const share = () =>
    void Share.share({ message: `Únete a mi sala de ${ROOM_GAMES[game].name} en Cash-Out. Código: ${code}\n${url}` }).catch(() => undefined)

  return (
    <Card className="items-center gap-3.5">
      <Text tone="muted" className="text-center text-sm">Escanea el QR o entra con el código</Text>
      <View accessible accessibilityRole="image" accessibilityLabel={`Código QR de la sala ${code}`} className="rounded-2xl bg-white p-3">
        <QRCode value={url} size={184} color="#181928" backgroundColor="#ffffff" />
      </View>
      <Text
        weight="semibold"
        accessibilityLabel={`Código ${code.split("").join(" ")}`}
        className="text-4xl"
        style={{ letterSpacing: 6, fontVariant: ["tabular-nums"] }}
      >
        {code}
      </Text>
      <View className="w-full">
        <Button label="Compartir código" variant="outline" onPress={share} />
      </View>
      <View className="flex-row items-center gap-1.5">
        <Share2 size={14} color={colors.mutedForeground} />
        <Text tone="muted" className="text-xs">Desde una laptop también se juega: el QR abre la web.</Text>
      </View>
    </Card>
  )
}
