import { useRef, useState, type ComponentRef } from "react"
import { View, type GestureResponderEvent } from "react-native"
import Svg, { Circle, Line, Polygon, Polyline, Text as SvgText } from "react-native-svg"
import { Text } from "@/components/ui/Text"
import { usePalette } from "@/theme/palette"

export interface ChartLine {
  values: number[]
  color: string
  dashed?: boolean
  /** Relleno suave bajo la linea. */
  area?: boolean
}

interface LineChartProps {
  height: number
  /** Todas comparten la escala; el cursor sigue a la primera. */
  lines: ChartLine[]
  /** Una linea punteada de referencia: el valor de inicio o tu costo. */
  guide?: { value: number; label: string }
  /** Maximo y minimo, arriba y abajo a la derecha. */
  extremes?: { top: string; bottom: string }
  /** Dia marcado al deslizar; null sin marcar. */
  index?: number | null
  onScrub?: (index: number | null) => void
  /** Lo que dice la etiqueta sobre el punto marcado. */
  tip?: string
  /** Escala minima como fraccion del valor: el precio en vivo se mueve mucho menos que un mes. */
  minSpan?: number
  accessibilityLabel: string
}

const PAD_Y = 16

/** Un grafico de lineas en SVG. Si recibe onScrub, al deslizar el dedo marca el punto mas cercano. */
export function LineChart({ height, lines, guide, extremes, index = null, onScrub, tip, minSpan = 0.01, accessibilityLabel }: LineChartProps) {
  const colors = usePalette()
  const [width, setWidth] = useState(0)
  const box = useRef<ComponentRef<typeof View>>(null)
  const left = useRef(0)

  const all = lines.flatMap((line) => line.values).concat(guide ? [guide.value] : [])
  const count = Math.max(...lines.map((line) => line.values.length), 2)
  const min = Math.min(...all)
  const max = Math.max(...all)
  // Piso de escala: unos centimos no deben verse como un salto.
  const pad = Math.max((max - min) * 0.1, Math.abs(max) * minSpan, minSpan < 0.01 ? 0 : 0.5)
  const lo = min - pad
  const hi = max + pad
  const x = (i: number) => (i / (count - 1)) * width
  const y = (v: number) => height - PAD_Y - ((v - lo) / (hi - lo)) * (height - 2 * PAD_Y)
  const points = (values: number[]) => values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")

  const main = lines[0]
  const marked = index ?? main.values.length - 1
  const markX = x(marked)
  const markY = y(main.values[marked] ?? 0)

  const pick = (event: GestureResponderEvent) => {
    if (!onScrub || width === 0) return
    const offset = event.nativeEvent.pageX - left.current
    onScrub(Math.min(main.values.length - 1, Math.max(0, Math.round((offset / width) * (count - 1)))))
  }

  return (
    <View
      ref={box}
      role="img"
      aria-label={accessibilityLabel}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => Boolean(onScrub)}
      onMoveShouldSetResponder={() => Boolean(onScrub)}
      // Mientras se desliza sobre el grafico, el scroll de la pantalla no se lleva el gesto.
      onResponderTerminationRequest={() => false}
      onResponderGrant={(event) => {
        const pageX = event.nativeEvent.pageX
        box.current?.measureInWindow((windowX) => {
          left.current = windowX
          pick({ ...event, nativeEvent: { ...event.nativeEvent, pageX } })
        })
      }}
      onResponderMove={pick}
      onResponderRelease={() => onScrub?.(null)}
      onResponderTerminate={() => onScrub?.(null)}
      // En web, arrastrar no debe seleccionar los textos del SVG.
      style={{ height, userSelect: "none" }}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          {guide ? (
            <>
              <Line x1={0} x2={width} y1={y(guide.value)} y2={y(guide.value)} stroke={colors.mutedForeground} strokeWidth={1} strokeDasharray="3 4" />
              <SvgText
                x={0}
                y={y(guide.value) > height - 28 ? y(guide.value) - 5 : y(guide.value) + 13}
                fontSize={10}
                fontFamily="Geist_400Regular"
                fill={colors.mutedForeground}
              >
                {guide.label}
              </SvgText>
            </>
          ) : null}
          {lines.map((line, i) =>
            line.area ? <Polygon key={`a${i}`} points={`0,${height} ${points(line.values)} ${x(line.values.length - 1)},${height}`} fill={line.color} opacity={0.1} /> : null,
          )}
          {lines.map((line, i) => (
            <Polyline
              key={i}
              points={points(line.values)}
              fill="none"
              stroke={line.color}
              strokeWidth={i === 0 ? 2.2 : 1.8}
              strokeDasharray={line.dashed ? "5 3" : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {extremes ? (
            <>
              <SvgText x={width} y={10} textAnchor="end" fontSize={10} fontFamily="Geist_400Regular" fill={colors.mutedForeground}>{extremes.top}</SvgText>
              <SvgText x={width} y={height - 2} textAnchor="end" fontSize={10} fontFamily="Geist_400Regular" fill={colors.mutedForeground}>{extremes.bottom}</SvgText>
            </>
          ) : null}
          {index !== null ? <Line x1={markX} x2={markX} y1={0} y2={height} stroke={colors.foreground} strokeOpacity={0.35} strokeWidth={1} /> : null}
          <Circle cx={markX} cy={markY} r={5} fill={main.color} stroke={colors.card} strokeWidth={2} />
        </Svg>
      ) : null}
      {index !== null && tip && width > 0 ? (
        <View
          pointerEvents="none"
          className="absolute -top-8 rounded-lg bg-foreground px-2.5 py-1"
          style={{ left: Math.min(Math.max(markX - 70, 0), width - 140), width: 140 }}
        >
          <Text weight="medium" tone="inverse" className="text-center text-xs">{tip}</Text>
        </View>
      ) : null}
    </View>
  )
}
