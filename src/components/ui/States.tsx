import { useEffect, useState } from "react"
import { Animated, View, type DimensionValue } from "react-native"
import type { LucideIcon } from "lucide-react-native"
import { userMessage, type ApiError } from "@/api/errors"
import { Button } from "@/components/ui/Button"
import { Text, Title } from "@/components/ui/Text"
import { usePalette } from "@/theme/palette"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  message: string
  action?: { label: string; onPress: () => void }
}

/** Lo que se ve cuando una lista no tiene nada todavia: que es y como empezar. */
export function EmptyState({ icon: Icon, title, message, action }: EmptyStateProps) {
  const colors = usePalette()
  return (
    <View className="items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-10">
      <View className="size-14 items-center justify-center rounded-full bg-accent">
        <Icon size={26} color={colors.accentInk} />
      </View>
      <Title size="md" className="text-center">{title}</Title>
      <Text tone="muted" className="text-center text-sm leading-5">{message}</Text>
      {action ? (
        <View className="mt-1 self-stretch">
          <Button label={action.label} onPress={action.onPress} />
        </View>
      ) : null}
    </View>
  )
}

/** Un error de carga con el mensaje para el usuario y, si sirve de algo, "Reintentar". */
export function ErrorState({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  return (
    <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-destructive bg-card p-4">
      <Text tone="destructive" className="text-sm">{userMessage(error)}</Text>
      {error.retryable ? <Button label="Reintentar" variant="outline" onPress={onRetry} /> : null}
    </View>
  )
}

/** Un bloque gris que late mientras carga, con la forma de lo que va a aparecer. */
export function Skeleton({ width = "100%", height = 16 }: { width?: DimensionValue; height?: number }) {
  const [opacity] = useState(() => new Animated.Value(0.5))
  const colors = usePalette()

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    )
    pulse.start()
    return () => pulse.stop()
  }, [opacity])

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      // Animated.View no toma las clases de NativeWind: el color va directo.
      style={{ width, height, opacity, borderRadius: 8, backgroundColor: colors.muted }}
    />
  )
}
