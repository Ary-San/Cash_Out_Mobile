import { useState } from "react"
import { Pressable, View } from "react-native"
import { router } from "expo-router"
import { Bell, PiggyBank, ShieldAlert, Target, TrendingUp, type LucideIcon } from "lucide-react-native"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Screen } from "@/components/ui/Screen"
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States"
import { Text } from "@/components/ui/Text"
import { useApiQuery } from "@/hooks/useApiQuery"
import { appRoute } from "@/lib/notifications"
import { lastActive } from "@/lib/sessions"
import { notificationService } from "@/services/notificationService"
import { usePalette } from "@/theme/palette"
import type { AppNotification } from "@/types/notifications"

const ICONS: Record<AppNotification["type"], LucideIcon> = {
  BUDGET: PiggyBank,
  SECURITY: ShieldAlert,
  GOAL: Target,
  ORDER: TrendingUp,
  GENERAL: Bell,
}

/**
 * El centro de avisos: presupuestos al 80 y al 100 %, metas cumplidas, ordenes
 * ejecutadas e inicios de sesion nuevos. Tocar uno lo marca como leido y lleva a
 * donde corresponde.
 */
export default function NotificationsScreen() {
  const colors = usePalette()
  const query = useApiQuery(["notifications"], (signal) => notificationService.list(signal))
  // Lo leido en esta visita: se pinta enseguida, sin esperar a recargar.
  const [read, setRead] = useState<Set<number>>(new Set())
  const [allRead, setAllRead] = useState(false)
  const items = (query.data?.content ?? []).map((n) => (allRead || read.has(n.id) ? { ...n, read: true } : n))
  const pending = items.some((n) => !n.read)

  const open = (item: AppNotification) => {
    if (!item.read) {
      setRead((prev) => new Set(prev).add(item.id))
      notificationService.markRead(item.id).catch(() => undefined)
    }
    const route = appRoute(item.link)
    if (route) router.push(route)
  }

  const readAll = () => {
    setAllRead(true)
    notificationService.markAllRead().catch(() => undefined)
  }

  return (
    <Screen title="Avisos" back onRefresh={query.reload} refreshing={query.isRefreshing}>
      {query.error ? <ErrorState error={query.error} onRetry={query.reload} /> : null}
      {query.isLoading ? (
        <Card className="gap-4">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} height={44} />
          ))}
        </Card>
      ) : null}
      {query.data && items.length === 0 ? (
        <EmptyState icon={Bell} title="No tienes avisos todavía" message="Aquí aparecerán tus presupuestos, metas cumplidas e inicios de sesión nuevos." />
      ) : null}
      {items.length > 0 ? (
        <>
          {pending ? <Button label="Marcar todo como leído" variant="outline" onPress={readAll} /> : null}
          <Card className="px-0 py-1">
            {items.map((item, index) => {
              const Icon = ICONS[item.type]
              const security = item.type === "SECURITY"
              return (
                <Pressable
                  key={item.id}
                  role="button"
                  aria-label={`${item.read ? "" : "Sin leer. "}${item.title}. ${item.body}`}
                  onPress={() => open(item)}
                  className={`flex-row gap-3 px-4 py-3.5 active:opacity-80 ${index > 0 ? "border-t border-border" : ""} ${item.read ? "" : "bg-accent/40"}`}
                >
                  <View className={`mt-0.5 size-9 items-center justify-center rounded-xl ${security ? "bg-destructive/10" : "bg-muted"}`}>
                    <Icon size={18} color={security ? colors.destructive : colors.mutedForeground} />
                  </View>
                  <View className="flex-1 gap-0.5">
                    <View className="flex-row items-start gap-2">
                      <Text weight={item.read ? "regular" : "semibold"} className="flex-1 text-sm">{item.title}</Text>
                      {item.read ? null : <View className="mt-1.5 size-2 rounded-full bg-accent-ink" />}
                    </View>
                    <Text tone="muted" className="text-[13px] leading-5">{item.body}</Text>
                    <Text tone="muted" className="text-xs">{lastActive(item.createdAt).replace(/^./, (c) => c.toUpperCase())}</Text>
                  </View>
                </Pressable>
              )
            })}
          </Card>
        </>
      ) : null}
    </Screen>
  )
}
