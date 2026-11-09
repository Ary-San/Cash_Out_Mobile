import { useEffect, useState } from "react"
import { Animated, Easing, Platform, View } from "react-native"
import Svg, { Circle, Line, Polyline } from "react-native-svg"
import { Text } from "@/components/ui/Text"
import { useReducedMotion } from "@/hooks/useReducedMotion"
import { formatSoles } from "@/lib/format"
import type { ForecastChart } from "@/lib/goals"
import { usePalette } from "@/theme/palette"

const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const SIZE = 188
const RADIUS = 80
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** El anillo de avance: se llena animado cuando cambia el progreso (al abrir o al aportar). */
export function ProgressRing({ progress, color, label, caption }: { progress: number; color: string; label: string; caption: string }) {
  const colors = usePalette()
  const [offset] = useState(() => new Animated.Value(CIRCUMFERENCE))
  const reduced = useReducedMotion()

  // Con "Reducir movimiento" el anillo aparece ya lleno hasta el avance, sin recorrerlo.
  useEffect(() => {
    const toValue = CIRCUMFERENCE * (1 - progress)
    if (reduced) {
      offset.setValue(toValue)
      return
    }
    Animated.timing(offset, {
      toValue,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start()
  }, [offset, progress, reduced])

  return (
    <View className="items-center justify-center" style={{ width: SIZE, height: SIZE }} accessible accessibilityLabel={`${label}, ${caption}`}>
      <Svg width={SIZE} height={SIZE} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke={colors.muted} strokeWidth={14} />
        {/* En la vista web, Animated le pasa al SVG un atributo que solo existe en nativo: ahi va quieto. */}
        {Platform.OS === "web" ? (
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          />
        ) : (
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
        )}
      </Svg>
      <Text weight="semibold" className="text-[38px]">{label}</Text>
      <Text tone="muted" className="text-center text-[13px]">{caption}</Text>
    </View>
  )
}

const WIDTH = 314
const HEIGHT = 112

/** Lo aportado y la proyeccion a este ritmo frente a la fecha limite y el objetivo. */
export function ForecastLines({ chart, color, deadlineColor, description }: { chart: ForecastChart; color: string; deadlineColor: string; description: string }) {
  const colors = usePalette()
  const legend = [
    { label: "Lo aportado", mark: <View className="h-[3px] w-3.5 rounded-full" style={{ backgroundColor: color }} /> },
    { label: "A tu ritmo", mark: <View className="w-3.5 border-t-2 border-dashed" style={{ borderColor: color }} /> },
    { label: "Fecha límite", mark: <View className="h-3 w-0.5" style={{ backgroundColor: deadlineColor }} /> },
  ]

  return (
    <View className="gap-2.5">
      <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={description}>
        <Line x1="0" y1={chart.targetY} x2={WIDTH} y2={chart.targetY} stroke={colors.border} strokeWidth={1} strokeDasharray="2 4" />
        <Line x1={chart.deadlineX} y1="0" x2={chart.deadlineX} y2={HEIGHT - 6} stroke={deadlineColor} strokeWidth={1.5} />
        <Line x1="0" y1={HEIGHT - 6} x2={WIDTH} y2={HEIGHT - 6} stroke={colors.border} strokeWidth={1} />
        {chart.projection ? (
          <Polyline points={chart.projection} fill="none" stroke={color} strokeWidth={2} strokeDasharray="5 5" strokeLinecap="round" />
        ) : null}
        <Polyline points={chart.actual} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={chart.todayX} cy={chart.todayY} r={4.5} fill={color} stroke={colors.card} strokeWidth={2} />
      </Svg>
      <View className="flex-row flex-wrap gap-x-3.5 gap-y-1.5">
        {legend.map(({ label, mark }) => (
          <View key={label} className="flex-row items-center gap-1.5">
            {mark}
            <Text tone="muted" className="text-xs">{label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

/** Aportes de los ultimos meses en barras; el mes actual se marca. */
export function MonthlyBars({ months, color }: { months: { label: string; total: number }[]; color: string }) {
  const colors = usePalette()
  const max = Math.max(...months.map((m) => m.total), 1)
  const description = months.map((m) => `${m.label} ${formatSoles(m.total)}`).join(", ")

  return (
    <View className="h-24 flex-row items-end gap-2 pt-1.5" accessible accessibilityLabel={`Aportes por mes: ${description}`}>
      {months.map((m, i) => (
        <View key={m.label} className="h-full flex-1 items-center justify-end gap-1">
          <Text tone="muted" className="min-h-[13px] text-[10.5px]">{m.total ? Math.round(m.total) : ""}</Text>
          <View
            className="w-full max-w-[30px] rounded-t-md rounded-b-sm"
            style={{ height: m.total ? Math.max(6, (m.total / max) * 56) : 3, backgroundColor: m.total ? color : colors.muted }}
          />
          <Text weight={i === months.length - 1 ? "semibold" : "regular"} tone={i === months.length - 1 ? "default" : "muted"} className="text-[11px]">
            {m.label}
          </Text>
        </View>
      ))}
    </View>
  )
}
