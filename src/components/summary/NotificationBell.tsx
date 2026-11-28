import { useCallback, useState } from "react"
import { Pressable, View } from "react-native"
import { router, useFocusEffect } from "expo-router"
import { Bell } from "lucide-react-native"
import { Text } from "@/components/ui/Text"
import { usePolling } from "@/hooks/usePolling"
import { notificationService } from "@/services/notificationService"
import { usePalette } from "@/theme/palette"

/** Cada cuanto se mira si hay avisos nuevos (solo el numero, que es liviano). */
const POLL_MS = 60_000

/** La campanita del Resumen: el numero de avisos sin leer; al tocarla abre la lista. */
export function NotificationBell() {
  const colors = usePalette()
  const [unread, setUnread] = useState(0)
  const refresh = useCallback(() => {
    notificationService.unread().then(setUnread).catch(() => undefined)
  }, [])
  // Al volver de la lista (donde se leyeron) el numero tiene que bajar.
  useFocusEffect(refresh)
  usePolling(refresh, POLL_MS)

  return (
    <Pressable
      role="button"
      aria-label={unread > 0 ? `Avisos: ${unread} sin leer` : "Avisos"}
      onPress={() => router.push("/notifications")}
      className="size-11 items-center justify-center rounded-full border border-border active:opacity-80"
    >
      <Bell size={20} color={colors.foreground} />
      {unread > 0 ? (
        <View className="absolute -right-0.5 -top-0.5 h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1">
          <Text weight="semibold" tone="inverse" className="text-[10px]">{unread > 9 ? "9+" : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  )
}
