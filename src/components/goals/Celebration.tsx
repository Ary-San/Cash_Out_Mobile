import { useEffect, useState } from "react"
import { Animated, Easing, Modal, View, useWindowDimensions } from "react-native"
import Reanimated, { ZoomIn } from "react-native-reanimated"
import { CircleDot, Trophy } from "lucide-react-native"
import { Button } from "@/components/ui/Button"
import { Text, Title } from "@/components/ui/Text"
import { useReducedMotion } from "@/hooks/useReducedMotion"
import { formatSoles } from "@/lib/format"
import { useCategoryColors, usePalette } from "@/theme/palette"

const PIECES = 22

/** Un papelito que cae girando; cada uno sale con su propio retraso. */
function Confetti({ index, color, height }: { index: number; color: string; height: number }) {
  const [fall] = useState(() => new Animated.Value(0))
  useEffect(() => {
    Animated.timing(fall, { toValue: 1, duration: 1800, delay: (index * 83) % 600, easing: Easing.out(Easing.quad), useNativeDriver: true }).start()
  }, [fall, index])

  return (
    <Animated.View
      testID="confetti"
      pointerEvents="none"
      style={{
        position: "absolute",
        top: -16,
        left: `${(index * 37) % 100}%`,
        width: 8,
        height: 14,
        borderRadius: 2,
        backgroundColor: color,
        opacity: fall.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
        transform: [
          { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, height + 32] }) },
          { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "540deg"] }) },
        ],
      }}
    />
  )
}

interface CelebrationProps {
  visible: boolean
  name: string
  target: number
  tokens: number
  onClose: () => void
}

export function Celebration({ visible, name, target, tokens, onClose }: CelebrationProps) {
  const colors = usePalette()
  const categories = useCategoryColors()
  const { height } = useWindowDimensions()
  // Con "Reducir movimiento" no cae confeti: la tarjeta de la meta basta para celebrar.
  const reduced = useReducedMotion()
  const confetti = [categories.FOOD, categories.TRANSPORT, categories.SERVICES, categories.EDUCATION, categories.LEISURE, colors.accentInk]

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 items-center justify-center bg-black/55 px-6">
        {reduced
          ? null
          : Array.from({ length: PIECES }, (_, i) => <Confetti key={i} index={i} color={confetti[i % confetti.length]} height={height} />)}
        <Reanimated.View entering={ZoomIn.springify().damping(14)} accessibilityRole="alert" style={{ width: "100%" }}>
          <View className="w-full items-center gap-2.5 rounded-[28px] bg-card px-6 pb-5 pt-7">
          <View className="size-16 items-center justify-center rounded-full bg-accent">
            <Trophy size={30} color={colors.accentInk} />
          </View>
          <Title className="text-center">¡Meta cumplida!</Title>
          <Text className="text-center text-[15px] leading-6">Juntaste {formatSoles(target)} para {name}.</Text>
          {tokens > 0 ? (
            <View className="min-h-9 flex-row items-center gap-1.5 rounded-full border border-border px-3.5">
              <CircleDot size={16} color={colors.accentInk} />
              <Text weight="semibold" className="text-sm">+{tokens} fichas para el simulador</Text>
            </View>
          ) : null}
          <View className="mt-2 self-stretch">
            <Button label="Genial" onPress={onClose} />
          </View>
          </View>
        </Reanimated.View>
      </View>
    </Modal>
  )
}
