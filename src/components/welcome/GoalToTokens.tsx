import { useEffect, useState } from "react"
import { View } from "react-native"
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import Svg, { Circle } from "react-native-svg"
import { CircleDot } from "lucide-react-native"
import { Text } from "@/components/ui/Text"
import { useReducedMotion } from "@/hooks/useReducedMotion"
import { formatSoles } from "@/lib/format"
import { completionReward } from "@/lib/goals"
import { usePalette } from "@/theme/palette"

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

const STROKE = 14

/** Un ejemplo con la regla real de la app: cumplir una meta da el 1 % en fichas. */
const GOAL = { name: "Laptop", target: 2000 }
const REWARD = completionReward(GOAL.target)

// Un ciclo: se llena (2.6 s), queda cumplida con las fichas a la vista (2.8 s) y se apaga para volver a empezar (0.6 s).
const FILL_MS = 2600
const HOLD_MS = 2800
const RESET_MS = 600

/**
 * El mecanismo de Cash-Out en una imagen: una meta de ahorro se llena hasta el
 * 100 % y se convierte en fichas para practicar inversiones.
 */
interface GoalToTokensProps {
  /** Si la pantalla esta a la vista. Detras del login el bucle se detiene: no gasta bateria. */
  active?: boolean
  /** Diametro del anillo; en telefonos bajos se achica para que entren los botones. */
  size?: number
}

export function GoalToTokens({ active = true, size: SIZE = 208 }: GoalToTokensProps) {
  const RADIUS = (SIZE - STROKE) / 2
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const colors = usePalette()
  const reduced = useReducedMotion()
  const progress = useSharedValue(0)
  const reveal = useSharedValue(0)
  const flash = useSharedValue(0)
  const [percent, setPercent] = useState(0)

  useEffect(() => {
    if (reduced) {
      cancelAnimation(progress)
      progress.set(1)
      reveal.set(1)
      return
    }
    if (!active) {
      cancelAnimation(progress)
      return
    }
    progress.set(0)
    progress.set(
      withDelay(
        400,
        withRepeat(
          withSequence(
            withTiming(1, { duration: FILL_MS, easing: Easing.out(Easing.cubic) }),
            withDelay(HOLD_MS, withTiming(0, { duration: RESET_MS, easing: Easing.in(Easing.quad) })),
          ),
          -1,
        ),
      ),
    )
    return () => cancelAnimation(progress)
  }, [progress, reveal, reduced, active])

  // El porcentaje del centro sigue al anillo, numero entero a numero entero.
  useAnimatedReaction(
    () => Math.round(progress.value * 100),
    (now, before) => {
      if (now !== before) runOnJS(setPercent)(now)
    },
  )

  const ring = useAnimatedProps(() => ({ strokeDashoffset: CIRCUMFERENCE * (1 - progress.value) }))
  // Al cumplirse aparecen las fichas y un destello detras del anillo que se apaga solo; se animan solo cuando cambia el estado.
  useAnimatedReaction(
    () => progress.value >= 0.999,
    (now, before) => {
      if (now === before) return
      reveal.set(withTiming(now ? 1 : 0, { duration: now ? 520 : 240, easing: Easing.out(Easing.cubic) }))
      if (now) flash.set(withSequence(withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 900, easing: Easing.in(Easing.quad) })))
    },
  )
  const chip = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateY: 18 * (1 - reveal.value) }],
  }))
  const glow = useAnimatedStyle(() => ({
    opacity: 0.7 * flash.value,
    transform: [{ scale: 0.95 + 0.25 * flash.value }],
  }))

  // Con reducir movimiento la meta se muestra ya cumplida, sin recorrer el anillo.
  const shown = reduced ? 100 : percent
  const done = shown >= 100
  return (
    <View
      accessible
      accessibilityLabel={`Ejemplo: la meta ${GOAL.name} de ${formatSoles(GOAL.target)} se cumple y te da ${REWARD} fichas para practicar inversiones.`}
      className="items-center gap-4"
    >
      <View style={{ width: SIZE, height: SIZE }} className="items-center justify-center">
        <Animated.View
          pointerEvents="none"
          style={[
            { position: "absolute", width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: colors.accent },
            glow,
          ]}
        />
        <Svg width={SIZE} height={SIZE} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill={colors.card} stroke={colors.muted} strokeWidth={STROKE} />
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={colors.accentInk}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            animatedProps={ring}
          />
        </Svg>
        {/* Se dice que es un ejemplo: quien recien llega no debe creer que es su meta. */}
        <Text tone="muted" className="text-xs">Ejemplo · {GOAL.name}</Text>
        <Text weight="semibold" className="text-4xl" style={{ fontVariant: ["tabular-nums"] }}>{shown} %</Text>
        <Text tone={done ? "accent" : "muted"} weight={done ? "medium" : "regular"} className="text-xs">
          {done ? "¡Meta cumplida!" : `de ${formatSoles(GOAL.target)}`}
        </Text>
      </View>

      <Animated.View style={chip} className="min-h-9 flex-row items-center gap-1.5 rounded-full border border-accent-ink bg-accent px-3.5">
        <CircleDot size={16} color={colors.accentInk} />
        <Text weight="semibold" tone="accent" className="text-sm">+{REWARD} fichas para invertir</Text>
      </Animated.View>
    </View>
  )
}
