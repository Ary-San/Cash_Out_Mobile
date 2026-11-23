import { useState } from "react"
import { View } from "react-native"
import Svg, { Line, Path, Rect } from "react-native-svg"
import { FLAT_BAND } from "@/lib/updown"
import type { UpDownChoice } from "@/types/updown"
import { usePalette } from "@/theme/palette"

/** Un mes de bolsa: el corte queda siempre en el mismo lugar, revelado o no. */
const FUTURE_DAYS = 21

interface UpDownChartProps {
  past: number[]
  future: number[] | null
  outcome?: UpDownChoice
  height: number
}

/** Los cierres hasta la noticia y, tapado hasta revelar, el mes siguiente con la franja de "Igual". */
export function UpDownChart({ past, future, outcome, height }: UpDownChartProps) {
  const colors = usePalette()
  const [width, setWidth] = useState(0)
  const total = past.length - 1 + FUTURE_DAYS
  const values = [...past, ...(future ?? []), 100 - FLAT_BAND, 100 + FLAT_BAND]
  const low = Math.min(...values)
  const high = Math.max(...values)
  const pad = (high - low) * 0.08 || 1
  const x = (i: number) => (i / total) * width
  const y = (v: number) => height - ((v - (low - pad)) / (high - low + 2 * pad)) * height
  const line = (points: number[], offset: number) => points.map((v, i) => `${i ? "L" : "M"}${x(i + offset).toFixed(1)} ${y(v).toFixed(1)}`).join(" ")
  const cut = x(past.length - 1)
  const outcomeColor = outcome === "UP" ? colors.gain : outcome === "DOWN" ? colors.loss : colors.accentInk
  const label = future
    ? `Precio: el mes siguiente terminó en ${future[future.length - 1].toFixed(1)}, partiendo de 100.`
    : "Precio hasta el día de la noticia; el mes siguiente está tapado."

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ height }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {/* La franja de "Igual": entre −2 % y +2 % del dia de la noticia. */}
          <Rect x={cut} width={width - cut} y={y(100 + FLAT_BAND)} height={y(100 - FLAT_BAND) - y(100 + FLAT_BAND)} fill={colors.accentInk} fillOpacity={0.1} />
          <Path d={`${line(past, 0)} L${cut} ${height} L0 ${height} Z`} fill={colors.accentInk} fillOpacity={0.1} />
          <Path d={line(past, 0)} fill="none" stroke={colors.accentInk} strokeWidth={2.2} />
          {future ? (
            <Path d={line(future, past.length - 1)} fill="none" stroke={outcomeColor} strokeWidth={2.6} />
          ) : (
            <Rect x={cut} width={width - cut} height={height} fill={colors.muted} fillOpacity={0.7} />
          )}
          <Line x1={cut} x2={cut} y1={0} y2={height} stroke={colors.mutedForeground} strokeWidth={1.5} strokeDasharray="4 4" />
        </Svg>
      ) : null}
    </View>
  )
}
