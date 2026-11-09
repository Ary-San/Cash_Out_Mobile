import { View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { WifiOff } from "lucide-react-native"
import { Text } from "@/components/ui/Text"
import { useOnline } from "@/lib/network"
import { usePalette } from "@/theme/palette"

/** Aviso arriba cuando no hay internet. No tapa los toques: la app sigue mostrando lo ultimo que cargo. */
export function OfflineBanner() {
  const online = useOnline()
  const insets = useSafeAreaInsets()
  const colors = usePalette()
  if (online) return null
  return (
    <View pointerEvents="none" className="absolute inset-x-0 items-center" style={{ top: insets.top + 6 }}>
      <View role="alert" className="flex-row items-center gap-2 rounded-full bg-foreground px-3.5 py-2">
        <WifiOff size={14} color={colors.background} />
        <Text weight="medium" className="text-[13px] text-background">Sin conexión · reintentaremos al volver la red</Text>
      </View>
    </View>
  )
}
