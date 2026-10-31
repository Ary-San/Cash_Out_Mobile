import type { ReactNode } from "react"
import { RefreshControl, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Text, Title } from "@/components/ui/Text"
import { usePalette } from "@/theme/palette"

interface ScreenProps {
  title: string
  subtitle?: string
  /** Un boton o icono a la derecha del titulo. */
  action?: ReactNode
  children: ReactNode
  /** Si se pasa, la lista se recarga al deslizar hacia abajo. */
  onRefresh?: () => void
  refreshing?: boolean
}

/** El marco de cada pestana: area segura arriba, titulo y contenido con scroll. */
export function Screen({ title, subtitle, action, children, onRefresh, refreshing = false }: ScreenProps) {
  const colors = usePalette()

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="gap-5 px-5 pb-8 pt-4"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.mutedForeground} />
          ) : undefined
        }
      >
        <View className="flex-row items-end justify-between gap-3">
          <View className="flex-1 gap-1">
            <Title>{title}</Title>
            {subtitle ? <Text tone="muted" className="text-base">{subtitle}</Text> : null}
          </View>
          {action}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  )
}
