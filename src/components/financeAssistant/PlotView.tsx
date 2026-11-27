import { useEffect, useId, useMemo, useRef, useState, type ComponentRef } from "react"
import { View, type GestureResponderEvent } from "react-native"
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated"
import Svg, { Circle, ClipPath, Defs, G, Line, Mask, Path, Rect, Text as SvgText } from "react-native-svg"
import { Text } from "@/components/ui/Text"
import { useReducedMotion } from "@/hooks/useReducedMotion"
import { haptics } from "@/lib/haptics"
import { buildPlot, pickAt, plotHeight, plotSummary, type PlotBar, type PlotCell, type PlotPoint, type PlotScene, type PlotSlot } from "@/lib/plot"
import { usePalette, useSeriesColors } from "@/theme/palette"
import type { ColorToken, PlotSpec } from "@/types/financeAssistant"

const AnimatedRect = Animated.createAnimatedComponent(Rect)
const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const AnimatedG = Animated.createAnimatedComponent(G)

const ENTER_MS = 750
/** Cuanto se escalona cada grupo de barras al crecer (en fraccion de la animacion). */
const STAGGER = 0.08
/** Cuanto se separa la porcion tocada de la dona. */
const POP = 6

type TokenColor = (token: ColorToken | "ink") => string

/** Traduce los tokens de color de la gramatica a los colores del tema actual. */
function useTokenColor(): TokenColor {
  const colors = usePalette()
  const series = useSeriesColors()
  return (token) => {
    if (token === "ink") return colors.foreground
    if (token.startsWith("series-")) return series[(Number(token.slice(7)) - 1) % series.length]
    return { gain: colors.gain, loss: colors.loss, income: colors.income, expense: colors.expense, accent: colors.accentInk, muted: colors.mutedForeground }[token as "gain"] ?? colors.accentInk
  }
}

/**
 * Un grafico de la gramatica del asistente. Crece al aparecer: barras desde la
 * base, lineas y areas de izquierda a derecha, puntos con un pequeno rebote,
 * celdas en cascada y la dona llenandose en circulo. Se explora con el dedo:
 * en lineas y barras un cursor recorre el eje; en puntos y celdas se toca el
 * mas cercano; en la dona, la porcion se separa y el centro dice cuanto es.
 * Cada cambio vibra suave. Con "Reducir movimiento" aparece entero. Para el
 * lector de pantalla es un control ajustable que recorre los valores.
 */
export function PlotView({ spec }: { spec: PlotSpec }) {
  const colors = usePalette()
  const colorOf = useTokenColor()
  const reduced = useReducedMotion()
  const id = useId().replace(/:/g, "")
  const [width, setWidth] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const box = useRef<ComponentRef<typeof View>>(null)
  const origin = useRef({ x: 0, y: 0 })
  const progress = useSharedValue(reduced ? 1 : 0)

  const height = plotHeight(spec)
  const scene = useMemo(() => (width > 0 ? buildPlot(spec, width, height) : null), [spec, width, height])
  const interactive = !!scene && scene.pick !== "none" && scene.slots.length > 0

  useEffect(() => {
    progress.set(reduced ? 1 : withTiming(1, { duration: ENTER_MS, easing: Easing.out(Easing.cubic) }))
  }, [progress, reduced])

  const select = (index: number | null) => {
    if (index !== selected && index !== null) haptics.selection()
    setSelected(index)
  }

  const pick = (event: GestureResponderEvent) => {
    if (!scene || !interactive) return
    const hit = pickAt(scene, event.nativeEvent.pageX - origin.current.x, event.nativeEvent.pageY - origin.current.y)
    // En la dona, tocar fuera de las porciones suelta la seleccion.
    if (hit !== null || scene.pick === "angle") select(hit)
  }

  const slot = scene && selected !== null ? scene.slots[selected] : null
  const label = scene ? plotSummary(spec, scene) : spec.description
  const dimmed = (index: number) => !!scene?.highlight && selected !== null && index !== selected

  return (
    <View className="gap-2 rounded-2xl border border-border bg-card p-3.5">
      <Text weight="semibold" className="text-sm">{spec.title}</Text>
      <View
        ref={box}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityHint="Desliza hacia arriba o abajo para recorrer los valores"
        accessibilityValue={slot ? { text: `${slot.label}: ${slot.values.map((v) => (v.name === slot.label ? v.text : `${v.name} ${v.text}`)).join(", ")}` } : undefined}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(event) => {
          if (!scene || scene.slots.length === 0) return
          const current = selected ?? -1
          const next = event.nativeEvent.actionName === "increment" ? Math.min(scene.slots.length - 1, current + 1) : Math.max(0, current - 1)
          select(next)
        }}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        // Antes de medir no hay escena: se acepta el toque igual y pick() lo ignora.
        onStartShouldSetResponder={() => scene?.pick !== "none"}
        onMoveShouldSetResponder={() => scene?.pick !== "none"}
        // Mientras se explora el grafico, el scroll de la pantalla no se lleva el gesto.
        onResponderTerminationRequest={() => false}
        onResponderGrant={(event) => {
          const { pageX, pageY } = event.nativeEvent
          box.current?.measureInWindow((x, y) => {
            origin.current = { x, y }
            pick({ ...event, nativeEvent: { ...event.nativeEvent, pageX, pageY } })
          })
        }}
        onResponderMove={(event) => {
          // En la dona se elige al tocar, no al arrastrar.
          if (scene?.pick !== "angle") pick(event)
        }}
        style={{ height, userSelect: "none" }}
      >
        {scene ? (
          <>
            <Svg width={scene.width} height={scene.height}>
              <Defs>
                <ClipPath id={`${id}-reveal`}>
                  <Reveal scene={scene} progress={progress} />
                </ClipPath>
                {scene.center ? (
                  <Mask id={`${id}-ring`}>
                    <Fill scene={scene} progress={progress} />
                  </Mask>
                ) : null}
              </Defs>
              <Axes scene={scene} grid={colors.border} ink={colors.mutedForeground} />
              {scene.cells.map((cell) => (
                <Cell key={cell.key} cell={cell} progress={progress} fill={colorOf(cell.color)} dim={dimmed(cell.slot)} />
              ))}
              {scene.bars.map((bar) => (
                <Bar key={bar.key} bar={bar} scene={scene} progress={progress} fill={colorOf(bar.color)} ink={colors.mutedForeground} dim={dimmed(bar.slot)} />
              ))}
              <G clipPath={`url(#${id}-reveal)`}>
                {scene.areas.map((area) => (
                  <Path key={area.key} d={area.d} fill={colorOf(area.color)} fillOpacity={0.18} />
                ))}
                {scene.lines.map((line) => (
                  <Path key={line.key} d={line.d} stroke={colorOf(line.color)} strokeWidth={2.25} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ))}
                {scene.rules.map((rule) => (
                  <Line key={rule.key} x1={rule.x1} y1={rule.y1} x2={rule.x2} y2={rule.y2} stroke={colorOf(rule.color)} strokeWidth={1.5} opacity={dimmed(rule.slot) ? 0.35 : 1} />
                ))}
                {scene.refLines.map((ref) => (
                  <Line key={ref.key} x1={ref.x1} y1={ref.y1} x2={ref.x2} y2={ref.y2} stroke={colorOf(ref.color)} strokeWidth={1.5} strokeDasharray="5 4" />
                ))}
              </G>
              {scene.slices.length > 0 ? (
                <G mask={`url(#${id}-ring)`}>
                  {scene.slices.map((slice) => {
                    const active = slice.slot === selected
                    return (
                      <G key={slice.key} transform={active ? `translate(${(Math.cos(slice.mid) * POP).toFixed(2)} ${(Math.sin(slice.mid) * POP).toFixed(2)})` : undefined}>
                        <Path d={slice.d} fill={colorOf(slice.color)} stroke={colors.card} strokeWidth={1.5} opacity={dimmed(slice.slot) ? 0.4 : 1} />
                      </G>
                    )
                  })}
                </G>
              ) : null}
              {slot && (scene.pick === "x" || scene.pick === "y") ? (
                scene.pick === "y" ? (
                  <Line x1={scene.box.left} x2={scene.box.right} y1={slot.pos} y2={slot.pos} stroke={colors.mutedForeground} strokeWidth={1} strokeDasharray="3 3" />
                ) : (
                  <Line x1={slot.pos} x2={slot.pos} y1={scene.box.top} y2={scene.box.bottom} stroke={colors.mutedForeground} strokeWidth={1} strokeDasharray="3 3" />
                )
              ) : null}
              {scene.points.map((point) => (
                <Dot key={point.key} point={point} progress={progress} fill={colorOf(point.color)} ring={colors.card} active={point.slot === selected} dim={scene.pick === "xy" && dimmed(point.slot)} />
              ))}
              <Labels scene={scene} progress={progress} colorOf={colorOf} ring={colors.card} />
              {scene.center ? <Center scene={scene} slot={slot} ink={colors.foreground} muted={colors.mutedForeground} /> : null}
            </Svg>
            {slot && scene.pick !== "angle" ? <Tooltip scene={scene} slot={slot} colorOf={colorOf} /> : null}
          </>
        ) : null}
      </View>
      {scene?.ramp ? (
        <View className="flex-row items-center gap-1.5">
          <Text tone="muted" className="text-[11px]">{scene.ramp.min}</Text>
          {[0.12, 0.34, 0.56, 0.78, 1].map((step) => (
            <View key={step} className="size-3 rounded-[3px]" style={{ backgroundColor: colorOf(scene.ramp!.color), opacity: step }} />
          ))}
          <Text tone="muted" className="text-[11px]">{scene.ramp.max}</Text>
        </View>
      ) : null}
      {scene && scene.legend.length > 0 ? (
        <View className="flex-row flex-wrap gap-x-3 gap-y-1">
          {scene.legend.map((item) => (
            <View key={item.name} className="flex-row items-center gap-1.5">
              <View className="size-2.5 rounded-full" style={{ backgroundColor: colorOf(item.color) }} />
              <Text tone="muted" className="text-xs">{item.name}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {interactive && !slot ? <Text tone="muted" className="text-[11px]">{scene.pick === "angle" ? "Toca una porción para ver cuánto es." : "Toca o desliza sobre el gráfico para ver cada valor."}</Text> : null}
    </View>
  )
}

/** Ejes con sus marcas y la grilla del eje de valores. En la grilla de calor, solo los nombres de filas y columnas. */
function Axes({ scene, grid, ink }: { scene: PlotScene; grid: string; ink: string }) {
  const { box, horizontal } = scene
  if (scene.kind === "arc") return null
  if (scene.kind === "grid") {
    return (
      <G>
        {scene.valueTicks.map((tick, i) => (
          <SvgText key={`r${i}`} x={box.left - 6} y={tick.pos + 3.5} fontSize={10} fill={ink} textAnchor="end">{tick.label}</SvgText>
        ))}
        {scene.domainTicks.map((tick, i) => (
          <SvgText key={`c${i}`} x={tick.pos} y={box.bottom + 14} fontSize={10} fill={ink} textAnchor="middle">{tick.label}</SvgText>
        ))}
      </G>
    )
  }
  return (
    <G>
      {scene.valueTicks.map((tick) =>
        horizontal ? (
          <G key={`v${tick.pos}`}>
            <Line x1={tick.pos} x2={tick.pos} y1={box.top} y2={box.bottom} stroke={grid} strokeWidth={1} />
            <SvgText x={tick.pos} y={box.bottom + 14} fontSize={10} fill={ink} textAnchor="middle">{tick.label}</SvgText>
          </G>
        ) : (
          <G key={`v${tick.pos}`}>
            <Line x1={box.left} x2={box.right} y1={tick.pos} y2={tick.pos} stroke={grid} strokeWidth={1} />
            <SvgText x={box.left - 6} y={tick.pos + 3.5} fontSize={10} fill={ink} textAnchor="end">{tick.label}</SvgText>
          </G>
        ),
      )}
      {scene.domainTicks.map((tick, i) =>
        horizontal ? (
          <SvgText key={`d${i}`} x={box.left - 8} y={tick.pos + 3.5} fontSize={11} fill={ink} textAnchor="end">{tick.label}</SvgText>
        ) : (
          <SvgText key={`d${i}`} x={tick.pos} y={box.bottom + 15} fontSize={10} fill={ink} textAnchor="middle">{tick.label}</SvgText>
        ),
      )}
    </G>
  )
}

/** El rectangulo que va descubriendo lineas, areas, reglas y anotaciones de izquierda a derecha. */
function Reveal({ scene, progress }: { scene: PlotScene; progress: SharedValue<number> }) {
  const props = useAnimatedProps(() => ({ width: scene.width * progress.get() }))
  return <AnimatedRect x={0} y={0} height={scene.height} animatedProps={props} />
}

/** La mascara que llena la dona en circulo: un trazo grueso que se alarga desde las 12 en punto. */
function Fill({ scene, progress }: { scene: PlotScene; progress: SharedValue<number> }) {
  const { x, y, r0, r1 } = scene.center!
  const r = (r0 + r1) / 2
  const circumference = 2 * Math.PI * r
  const props = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - progress.get()) }))
  return (
    <AnimatedCircle
      cx={x}
      cy={y}
      r={r}
      fill="none"
      stroke="#fff"
      strokeWidth={r1 - r0 + POP * 2 + 4}
      strokeDasharray={`${circumference} ${circumference}`}
      transform={`rotate(-90 ${x} ${y})`}
      animatedProps={props}
    />
  )
}

/** Una barra que crece desde su base; cada grupo arranca un poco despues que el anterior. */
function Bar({ bar, scene, progress, fill, ink, dim }: { bar: PlotBar; scene: PlotScene; progress: SharedValue<number>; fill: string; ink: string; dim: boolean }) {
  const slots = Math.max(scene.slots.length, 1)
  const props = useAnimatedProps(() => {
    const local = Math.min(1, Math.max(0, progress.get() * (1 + STAGGER * slots) - STAGGER * bar.slot))
    if (scene.horizontal) {
      const from = Math.min(Math.max(bar.base, bar.x), bar.x + bar.w)
      return { x: from + (bar.x - from) * local, width: bar.w * local, y: bar.y, height: bar.h }
    }
    const from = Math.min(Math.max(bar.base, bar.y), bar.y + bar.h)
    return { x: bar.x, width: bar.w, y: from + (bar.y - from) * local, height: bar.h * local }
  })
  // El valor aparece cuando la barra termina de crecer.
  const labelProps = useAnimatedProps(() => ({ opacity: Math.min(1, Math.max(0, (progress.get() - 0.85) / 0.15)) }))
  return (
    <>
      <AnimatedRect rx={Math.min(4, bar.w / 2, bar.h / 2)} fill={fill} opacity={dim ? 0.35 : 1} animatedProps={props} />
      {bar.label ? (
        <AnimatedG animatedProps={labelProps}>
          <SvgText x={bar.x + bar.w + 6} y={bar.y + bar.h / 2 + 3.5} fontSize={10} fill={ink}>{bar.label}</SvgText>
        </AnimatedG>
      ) : null}
    </>
  )
}

/** Una celda de la grilla de calor: aparece en cascada desde la esquina superior izquierda. */
function Cell({ cell, progress, fill, dim }: { cell: PlotCell; progress: SharedValue<number>; fill: string; dim: boolean }) {
  const props = useAnimatedProps(() => {
    const local = Math.min(1, Math.max(0, progress.get() * 1.6 - cell.order * 0.6))
    return { opacity: cell.opacity * local * (dim ? 0.4 : 1) }
  })
  return <AnimatedRect x={cell.x} y={cell.y} width={cell.w} height={cell.h} rx={3} fill={fill} animatedProps={props} />
}

/** Un punto que aparece al final de la animacion, con un pequeno rebote. */
function Dot({ point, progress, fill, ring, active, dim }: { point: PlotPoint; progress: SharedValue<number>; fill: string; ring: string; active: boolean; dim: boolean }) {
  const props = useAnimatedProps(() => {
    const t = Math.min(1, Math.max(0, (progress.get() - 0.55) / 0.45))
    // Pasa un poco del tamano final y vuelve: el rebote.
    const bounce = t < 0.7 ? (t / 0.7) * 1.18 : 1.18 - ((t - 0.7) / 0.3) * 0.18
    return { r: point.r * (active ? 1.35 : 1) * bounce }
  })
  return <AnimatedCircle cx={point.cx} cy={point.cy} fill={fill} stroke={ring} strokeWidth={1.5} opacity={dim ? 0.3 : 1} animatedProps={props} />
}

/** Textos y nombres de las anotaciones: aparecen al final, cuando ya esta dibujado lo que senalan. */
function Labels({ scene, progress, colorOf, ring }: { scene: PlotScene; progress: SharedValue<number>; colorOf: TokenColor; ring: string }) {
  const props = useAnimatedProps(() => ({ opacity: Math.min(1, Math.max(0, (progress.get() - 0.8) / 0.2)) }))
  if (scene.texts.length === 0 && !scene.refLines.some((ref) => ref.label)) return null
  return (
    <AnimatedG animatedProps={props}>
      {scene.refLines.map((ref) =>
        ref.label ? (
          <SvgText key={ref.key} x={ref.label.x} y={ref.label.y} fontSize={10} fontWeight="600" fill={colorOf(ref.color)} textAnchor={ref.label.anchor}>{ref.label.text}</SvgText>
        ) : null,
      )}
      {scene.texts.map((text) => (
        <G key={text.key}>
          {text.dot ? <Circle cx={text.dot.x} cy={text.dot.y} r={3.5} fill={colorOf(text.color)} stroke={ring} strokeWidth={1.5} /> : null}
          <SvgText x={text.x} y={text.y} fontSize={10} fontWeight={text.dot ? "600" : "400"} fill={colorOf(text.color)} textAnchor={text.anchor}>{text.text}</SvgText>
        </G>
      ))}
    </AnimatedG>
  )
}

/** El centro de la dona: el total, o la porcion tocada con su monto y su parte. */
function Center({ scene, slot, ink, muted }: { scene: PlotScene; slot: PlotSlot | null; ink: string; muted: string }) {
  const { x, y } = scene.center!
  const [amount, share] = slot ? slot.values[0].text.split(" · ") : [scene.center!.total, null]
  return (
    <G>
      <SvgText x={x} y={y - 12} fontSize={10} fill={muted} textAnchor="middle">{slot ? slot.label : "Total"}</SvgText>
      <SvgText x={x} y={y + 5} fontSize={14} fontWeight="600" fill={ink} textAnchor="middle">{amount}</SvgText>
      {share ? <SvgText x={x} y={y + 20} fontSize={10} fill={muted} textAnchor="middle">{share}</SvgText> : null}
    </G>
  )
}

/** La etiqueta al tocar: el lugar y lo que vale cada cosa ahi. Se queda dentro del grafico. */
function Tooltip({ scene, slot, colorOf }: { scene: PlotScene; slot: PlotSlot; colorOf: TokenColor }) {
  const width = 160
  const tall = 26 + slot.values.length * 18
  const style =
    scene.pick === "y"
      ? { top: Math.min(Math.max(slot.pos - 20, 0), scene.height - tall), right: 0 }
      : scene.pick === "xy"
        ? {
            // Encima del punto o la celda si hay sitio; si no, debajo.
            top: slot.at.y - tall - 10 >= 0 ? slot.at.y - tall - 10 : Math.min(slot.at.y + 12, scene.height - tall),
            left: Math.min(Math.max(slot.at.x - width / 2, 0), scene.width - width),
          }
        : { top: 0, left: Math.min(Math.max(slot.pos - width / 2, 0), scene.width - width) }
  return (
    <View pointerEvents="none" className="absolute gap-1 rounded-xl border border-border bg-card px-2.5 py-2" style={[{ width }, style]}>
      <Text weight="semibold" className="text-xs">{slot.label}</Text>
      {slot.values.map((value, i) => (
        <View key={`${value.name}-${i}`} className="flex-row items-center gap-1.5">
          <View className="size-2 rounded-full" style={{ backgroundColor: colorOf(value.color) }} />
          <Text tone="muted" numberOfLines={1} className="flex-1 text-[11px]">{value.name}</Text>
          <Text weight="medium" className="text-[11px]" style={{ fontVariant: ["tabular-nums"] }}>{value.text}</Text>
        </View>
      ))}
    </View>
  )
}
