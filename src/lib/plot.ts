import { formatAxisValue, formatValue, shortDate } from "@/lib/financeAssistant"
import type { BlockUnit, ColorToken, PlotChannel, PlotColor, PlotLayer, PlotSpec } from "@/types/financeAssistant"

/**
 * El motor de los graficos del asistente: convierte la especificacion (datos,
 * capas, marcas y canales) en primitivas listas para dibujar (rectangulos,
 * trazos, circulos, porciones, textos, marcas de eje) y en los "puntos de
 * cursor" con lo que vale cada cosa ahi. Es logica pura: el mobile y la web la
 * dibujan cada uno con su SVG, sus animaciones y sus gestos. Este archivo es
 * igual en los dos fronts (la web lo copia con comillas simples).
 *
 * Hay tres tipos de escena:
 * - cartesian: barras, lineas, areas, puntos, reglas y textos sobre dos ejes;
 * - grid: la grilla de calor (rect), con la intensidad segun un valor;
 * - arc: la dona.
 */

export interface PlotBox {
  left: number
  top: number
  right: number
  bottom: number
}

export interface PlotBar {
  key: string
  x: number
  y: number
  w: number
  h: number
  color: ColorToken
  /** El punto de cursor al que pertenece (para resaltar y escalonar la animacion). */
  slot: number
  /** Desde donde crece al aparecer (en pixeles del eje de valores): la base, o su propio inicio si es flotante. */
  base: number
  /** El valor escrito al final de la barra (solo horizontales sin apilar, como un ranking). */
  label?: string
}

export interface PlotPath {
  key: string
  d: string
  color: ColorToken
}

export interface PlotPoint {
  key: string
  cx: number
  cy: number
  r: number
  color: ColorToken
  slot: number
}

/** Un segmento de la marca rule: la mecha de una vela, un rango de minimo a maximo. */
export interface PlotSegment {
  key: string
  x1: number
  y1: number
  x2: number
  y2: number
  color: ColorToken
  slot: number
}

/** Una celda de la grilla de calor. */
export interface PlotCell {
  key: string
  x: number
  y: number
  w: number
  h: number
  color: ColorToken
  /** La intensidad: de 0.12 (el menor) a 1 (el mayor); 0.05 si la celda no tiene dato. */
  opacity: number
  slot: number
  /** De 0 a 1: el orden en que aparece (de la esquina superior izquierda hacia abajo a la derecha). */
  order: number
}

/** Una porcion de la dona. Los angulos van en radianes desde las 12 en punto, en sentido horario. */
export interface PlotSlice {
  key: string
  d: string
  color: ColorToken
  slot: number
  a0: number
  a1: number
  /** El angulo del medio: hacia donde se separa la porcion al tocarla. */
  mid: number
  share: number
}

/** Un texto del grafico: la marca text o una anotacion que senala un punto. */
export interface PlotText {
  key: string
  x: number
  y: number
  text: string
  color: ColorToken | "ink"
  anchor: "start" | "middle" | "end"
  slot?: number
  /** Si senala un punto: ahi se dibuja un circulito. */
  dot?: { x: number; y: number }
}

/** Una linea de referencia de las anotaciones (objetivo, presupuesto, promedio), con su nombre. */
export interface PlotRefLine {
  key: string
  x1: number
  y1: number
  x2: number
  y2: number
  color: ColorToken
  label?: { x: number; y: number; text: string; anchor: "start" | "end" }
}

export interface PlotTick {
  pos: number
  label: string
}

/** Un lugar donde se puede parar el cursor, con lo que vale cada cosa ahi. */
export interface PlotSlot {
  /** La posicion en el eje que recorre el cursor (en x o en y). */
  pos: number
  /** Donde se ancla la etiqueta al tocar (centro del punto, de la celda o de la porcion). */
  at: { x: number; y: number }
  label: string
  values: { name: string; color: ColorToken; text: string }[]
}

export interface PlotScene {
  kind: "cartesian" | "grid" | "arc"
  width: number
  height: number
  box: PlotBox
  /** true si las barras son horizontales: el cursor se mueve por el eje y. */
  horizontal: boolean
  domainTicks: PlotTick[]
  /** En la grilla, las etiquetas de las filas (eje y). */
  valueTicks: PlotTick[]
  bars: PlotBar[]
  areas: PlotPath[]
  lines: PlotPath[]
  points: PlotPoint[]
  rules: PlotSegment[]
  cells: PlotCell[]
  slices: PlotSlice[]
  texts: PlotText[]
  refLines: PlotRefLine[]
  legend: { name: string; color: ColorToken }[]
  slots: PlotSlot[]
  /** Donde arrancan las barras y las areas (el cero del eje de valores). */
  baseline: number
  /**
   * Como se elige al tocar: "x"/"y" recorre el eje (lineas, barras), "xy" el
   * punto o la celda mas cercana, "angle" la porcion de la dona, "none" nada.
   */
  pick: "x" | "y" | "xy" | "angle" | "none"
  /** Si tocar una marca atenua las demas. */
  highlight: boolean
  /** Solo en la dona: el centro, los radios y el total (lo que se muestra en el medio). */
  center?: { x: number; y: number; r0: number; r1: number; total: string }
  /** Solo en la grilla: de que valor a que valor va la intensidad. */
  ramp?: { color: ColorToken; min: string; max: string }
}

const SERIES: ColorToken[] = ["series-1", "series-2", "series-3", "series-4", "series-5", "series-6", "series-7"]
const TAU = Math.PI * 2
/** Las 12 en punto. */
const TOP = -Math.PI / 2

type Row = Record<string, string | number | null>
type Raw = string | number

const defaultMeasure = (text: string) => text.length * 6.2

/** Fecha YYYY-MM-DD a dias desde 1970, sin zona horaria. */
function day(value: string): number {
  const [y, m, d] = value.split("-").map(Number)
  return Date.UTC(y, m - 1, d) / 86_400_000
}

/** La altura que conviene para el grafico, segun su tipo y cuantas filas tiene. */
export function plotHeight(spec: PlotSpec): number {
  const first = spec.layers[0]
  if (first.mark === "arc") return 210
  const distinct = (field: string | undefined) => (field ? new Set(spec.data.map((row) => row[field])).size : 0)
  if (first.mark === "rect") return Math.max(110, distinct(first.encoding.y?.field) * 28 + 30)
  if (isHorizontal(first)) return Math.max(140, distinct(first.encoding.y?.field) * 30 + 34)
  return 210
}

function isHorizontal(layer: PlotLayer): boolean {
  return layer.mark === "bar" && layer.encoding.y?.type === "category" && layer.encoding.x?.type === "quantitative"
}

/** Marcas de eje "lindas": 0, 50, 100... en vez de 0, 47.3, 94.6. */
export function niceTicks(min: number, max: number, count: number): number[] {
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1
    min -= pad
    max += pad
  }
  const raw = (max - min) / Math.max(count, 1)
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((f) => f * power).find((s) => s >= raw) ?? raw
  const start = Math.floor(min / step) * step
  // Hasta cubrir el maximo: una marca por debajo dejaria barras saliendose del grafico.
  const ticks: number[] = []
  for (let v = start; ticks.length < 50; v += step) {
    ticks.push(Math.round(v * 1e6) / 1e6)
    if (v >= max - step * 1e-9) break
  }
  return ticks
}

/** Una curva suave que pasa por todos los puntos (Catmull-Rom a Bezier), sin pasarse de los extremos. */
export function smoothPath(points: [number, number][]): string {
  if (points.length < 3) return linearPath(points)
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return d
}

export function linearPath(points: [number, number][]): string {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
}

/** Una porcion de dona entre dos angulos. Una porcion de vuelta entera se parte en dos (un arco SVG no la dibuja). */
export function arcPath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  if (a1 - a0 >= TAU - 1e-6) return `${arcPath(cx, cy, r0, r1, a0, a0 + Math.PI)} ${arcPath(cx, cy, r0, r1, a0 + Math.PI, a1)}`
  const large = a1 - a0 > Math.PI ? 1 : 0
  const p = (r: number, a: number) => `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
  return `M${p(r1, a0)} A${r1},${r1} 0 ${large} 1 ${p(r1, a1)} L${p(r0, a1)} A${r0},${r0} 0 ${large} 0 ${p(r0, a0)} Z`
}

/**
 * La gramatica entera de las expresiones de color: campo, comparador y un
 * numero, otro campo o un 'texto'. Se interpreta aqui; nunca se ejecuta como codigo.
 */
/** Escrito asi para que la copia de la web (que cambia las comillas dobles por simples) quede igual. */
const APOSTROPHE = String.fromCharCode(39)
const EXPRESSION = /^\s*([A-Za-z_À-ɏ][\wÀ-ɏ]*)\s*(>=|<=|==|!=|>|<)\s*(-?\d+(?:\.\d+)?|[A-Za-z_À-ɏ][\wÀ-ɏ]*|'[^']{0,40}')\s*$/

/** Si la fila cumple la expresion (c >= o, monto > 200, cat == 'Comida'). Lo que no se entiende es falso. */
export function evalWhen(expression: string, row: Row): boolean {
  const match = EXPRESSION.exec(expression)
  if (!match) return false
  const left = row[match[1]]
  const raw = match[3]
  const right: Raw | null | undefined = raw.startsWith(APOSTROPHE) ? raw.slice(1, -1) : /^-?\d/.test(raw) ? Number(raw) : row[raw]
  if (left === null || left === undefined || right === null || right === undefined) return false
  if (match[2] === "==") return String(left) === String(right)
  if (match[2] === "!=") return String(left) !== String(right)
  const a = typeof left === "number" ? left : Number(left)
  const b = typeof right === "number" ? right : Number(right)
  if (Number.isNaN(a) || Number.isNaN(b)) return false
  return match[2] === ">=" ? a >= b : match[2] === "<=" ? a <= b : match[2] === ">" ? a > b : a < b
}

/** El color de una fila: el condicional si lo hay; si no, el de su serie. */
function rowColor(color: PlotColor | undefined, row: Row, fallback: ColorToken): ColorToken {
  if (color && "when" in color) return evalWhen(color.when, row) ? color.then : color.else
  return fallback
}

/** El token fijo de una capa ({value}), si lo tiene. */
function fixedColor(color: PlotColor | undefined): ColorToken | null {
  return color && "value" in color && !("field" in color) && !("when" in color) ? color.value : null
}

/** El texto de un valor segun la unidad (o un numero simple si no hay). */
function valueText(value: number, unit: BlockUnit | undefined): string {
  return unit ? formatValue(value, unit) : value.toLocaleString("es-PE", { maximumFractionDigits: 2 })
}

/** Lo que se escribe de un valor cualquiera: numeros con la unidad, el resto tal cual. */
function anyText(value: Raw | null | undefined, unit: BlockUnit | undefined): string {
  if (value === null || value === undefined) return "—"
  return typeof value === "number" ? valueText(value, unit) : String(value)
}

/** Lo que escribe la marca text: sin centimos si el monto es entero, para que las etiquetas no se pisen. */
function labelText(value: Raw | null | undefined, unit: BlockUnit | undefined): string {
  return typeof value === "number" && Number.isInteger(value) ? formatAxisValue(value, unit ?? "COUNT") : anyText(value, unit)
}

/** La etiqueta de un lugar del eje de dominio. */
function domainLabel(raw: Raw, channel: PlotChannel): string {
  if (channel.type === "date") return shortDate(String(raw))
  if (typeof raw === "number") return raw.toLocaleString("es-PE", { maximumFractionDigits: 2 })
  return raw
}

function emptyScene(kind: PlotScene["kind"], width: number, height: number): PlotScene {
  return {
    kind,
    width,
    height,
    box: { left: 0, top: 0, right: width, bottom: height },
    horizontal: false,
    domainTicks: [],
    valueTicks: [],
    bars: [],
    areas: [],
    lines: [],
    points: [],
    rules: [],
    cells: [],
    slices: [],
    texts: [],
    refLines: [],
    legend: [],
    slots: [],
    baseline: height,
    pick: "none",
    highlight: true,
  }
}

interface Series {
  name: string
  color: ColorToken
  rows: Row[]
}

/** Separa las filas de una capa en series: una por valor del campo de color, o una sola. */
function seriesOf(layer: PlotLayer, data: Row[], palette: Map<string, ColorToken>, layerIndex: number): Series[] {
  const color = layer.encoding.color
  if (color && "field" in color) {
    const groups = new Map<string, Row[]>()
    for (const row of data) {
      const name = String(row[color.field] ?? "—")
      groups.set(name, [...(groups.get(name) ?? []), row])
    }
    return [...groups].map(([name, rows]) => {
      if (!palette.has(name)) palette.set(name, SERIES[palette.size % SERIES.length])
      return { name, color: palette.get(name)!, rows }
    })
  }
  const y = layer.encoding.y!
  const token = fixedColor(color) ?? SERIES[layerIndex % SERIES.length]
  return [{ name: y.title ?? y.field, color: token, rows: data }]
}

/**
 * Arma la escena: medidas, escalas, primitivas y puntos de cursor.
 *
 * @param measure ancho estimado de un texto (para dejar sitio a las etiquetas del eje)
 */
export function buildPlot(spec: PlotSpec, width: number, height: number, measure: (text: string) => number = defaultMeasure): PlotScene {
  const first = spec.layers[0]
  const scene = first.mark === "arc" ? buildArc(spec, width, height) : first.mark === "rect" ? buildGrid(spec, width, height, measure) : buildCartesian(spec, width, height, measure)
  scene.highlight = spec.interaction?.highlight ?? true
  if (spec.interaction?.cursor === "none") scene.pick = "none"
  return scene
}

/** Barras, lineas, areas, puntos, reglas y textos sobre dos ejes. */
function buildCartesian(spec: PlotSpec, width: number, height: number, measure: (text: string) => number): PlotScene {
  const first = spec.layers[0]
  const horizontal = isHorizontal(first)
  // El eje de dominio (categorias, fechas o numeros) y el de valores, segun la orientacion.
  const domainOf = (layer: PlotLayer) => (horizontal ? layer.encoding.y! : layer.encoding.x!)
  const valueOf = (layer: PlotLayer) => (horizontal ? layer.encoding.x! : layer.encoding.y!)
  const value2Of = (layer: PlotLayer) => (horizontal ? layer.encoding.x2 : layer.encoding.y2)
  const domainChannel = domainOf(first)
  const valueAxis = horizontal ? spec.axes?.x : spec.axes?.y
  const valueLetter = horizontal ? "x" : "y"
  const unit = valueAxis?.unit
  const hasBars = spec.layers.some((layer) => layer.mark === "bar")
  const palette = new Map<string, ColorToken>()
  const drawn = spec.layers.filter((layer) => layer.mark !== "text" && layer.mark !== "rule")
  const layers = spec.layers.map((layer, i) => ({ layer, series: layer.mark === "text" || layer.mark === "rule" ? [{ name: "", color: "muted" as ColorToken, rows: spec.data }] : seriesOf(layer, spec.data, palette, i) }))

  // ---- dominio: bandas (con barras o categorias) o lineal (fechas y numeros)
  const rawKeys: Raw[] = []
  for (const row of spec.data) {
    for (const { layer } of layers) {
      const value = row[domainOf(layer).field]
      if (value !== null && value !== undefined && !rawKeys.includes(value)) rawKeys.push(value)
    }
  }
  const numericDomain = domainChannel.type !== "category"
  const toNumber = (v: Raw) => (domainChannel.type === "date" ? day(String(v)) : Number(v))
  if (numericDomain) rawKeys.sort((a, b) => toNumber(a) - toNumber(b))
  const banded = hasBars || domainChannel.type === "category"
  // Puntos sueltos sobre un eje numerico (riesgo contra retorno): se toca el punto, no una columna.
  const scatter = !banded && domainChannel.type === "quantitative" && drawn.length > 0 && drawn.every((layer) => layer.mark === "point")

  // ---- valores: incluye pilas, extremos (y2), reglas, textos, anotaciones y el cero cuando corresponde
  const stackTotals = new Map<string, { pos: number; neg: number }>()
  let minValue = Infinity
  let maxValue = -Infinity
  const extend = (v: unknown) => {
    if (typeof v !== "number" || !Number.isFinite(v)) return
    minValue = Math.min(minValue, v)
    maxValue = Math.max(maxValue, v)
  }
  for (const { layer, series } of layers) {
    const v2 = value2Of(layer)?.field
    const stacked = (layer.mark === "bar" || layer.mark === "area") && series.length > 1 && layer.stack !== false && !v2
    for (const s of series) {
      for (const row of s.rows) {
        const v = row[valueOf(layer).field]
        if (v2) extend(row[v2])
        if (typeof v !== "number") continue
        if (stacked) {
          const key = `${layer.mark}|${String(row[domainOf(layer).field])}`
          const total = stackTotals.get(key) ?? { pos: 0, neg: 0 }
          if (v >= 0) total.pos += v
          else total.neg += v
          stackTotals.set(key, total)
          extend(total.neg)
          extend(total.pos)
        } else extend(v)
      }
    }
  }
  for (const note of spec.annotations ?? []) {
    if (note.type === "rule" && note.axis === valueLetter) extend(note.value)
    if (note.type === "label") extend(horizontal ? note.x : note.y)
  }
  if (!Number.isFinite(minValue)) {
    minValue = 0
    maxValue = 1
  }
  const zero = valueAxis?.zero ?? spec.layers.some((layer) => (layer.mark === "bar" && !value2Of(layer)) || layer.mark === "area")
  if (zero) {
    minValue = Math.min(0, minValue)
    maxValue = Math.max(0, maxValue)
  }
  const ticks = niceTicks(minValue, maxValue, horizontal ? Math.max(3, Math.floor(width / 85)) : 4)
  const lo = ticks[0]
  const hi = ticks[ticks.length - 1]

  // ---- medidas: sitio para las etiquetas
  const valueLabels = ticks.map((t) => formatAxisValue(t, unit ?? "COUNT"))
  const domainLabels = rawKeys.map((k) => domainLabel(k, domainChannel))
  const left = horizontal ? Math.min(width * 0.38, Math.max(...domainLabels.map(measure), 24) + 10) : Math.max(...valueLabels.map(measure), 24) + 10
  const box: PlotBox = { left, top: 10, right: width - (horizontal ? 64 : 10), bottom: height - 24 }
  const along = horizontal ? box.bottom - box.top : box.right - box.left
  const across = horizontal ? box.right - box.left : box.bottom - box.top

  // posicion a lo largo del dominio (centro de la banda o punto lineal)
  const band = banded ? along / Math.max(rawKeys.length, 1) : 0
  const minNum = numericDomain && rawKeys.length ? toNumber(rawKeys[0]) : 0
  const maxNum = numericDomain && rawKeys.length ? toNumber(rawKeys[rawKeys.length - 1]) : 1
  // En un grafico de puntos, un margen para que ninguno quede pegado al borde.
  const pad = scatter ? along * 0.04 : 0
  const domainPos = (raw: Raw): number => {
    const start = horizontal ? box.top : box.left
    if (banded) return start + band * rawKeys.indexOf(raw) + band / 2
    const span = maxNum - minNum || 1
    return start + pad + ((toNumber(raw) - minNum) / span) * (along - pad * 2)
  }
  /** La posicion de un valor de anotacion en el dominio, o null si no esta en el eje. */
  const domainPosOf = (raw: Raw): number | null => {
    if (banded) {
      const found = rawKeys.find((key) => String(key) === String(raw))
      return found === undefined ? null : domainPos(found)
    }
    const n = toNumber(raw)
    return Number.isFinite(n) && n >= minNum && n <= maxNum ? domainPos(raw) : null
  }
  // posicion del valor (de abajo hacia arriba, o de izquierda a derecha si es horizontal)
  const valuePos = (v: number): number => {
    const ratio = (v - lo) / (hi - lo || 1)
    return horizontal ? box.left + ratio * across : box.bottom - ratio * across
  }
  /** Un dato (lugar del dominio y valor) en pixeles x, y. */
  const place = (domain: number, value: number): [number, number] => (horizontal ? [value, domain] : [domain, value])
  const baseline = valuePos(Math.max(lo, Math.min(0, hi)))

  const scene = emptyScene("cartesian", width, height)
  scene.box = box
  scene.horizontal = horizontal
  scene.baseline = baseline
  scene.pick = scatter ? "xy" : horizontal ? "y" : "x"
  const { bars, areas, lines, points, rules, texts } = scene
  // Los puntos con tamano por campo guardan el valor crudo hasta escalarlo al final.
  const sizedPoints = new Set<PlotPoint>()
  const slotValues = new Map<Raw, PlotSlot["values"]>()
  // Una serie dibujada en dos capas (area y puntos, por ejemplo) se cuenta una sola vez.
  const addSlotValue = (raw: Raw, entry: PlotSlot["values"][number]) => {
    const current = slotValues.get(raw) ?? []
    if (current.some((v) => v.name === entry.name && v.color === entry.color && v.text === entry.text)) return
    slotValues.set(raw, [...current, entry])
  }
  const tooltip = spec.interaction?.tooltip?.length ? spec.interaction.tooltip : null
  // En el tooltip, la unidad del eje solo va en los campos que estan en ese eje (en velas: o, h, l, c).
  const valueFields = new Set(spec.layers.flatMap((layer) => [valueOf(layer).field, value2Of(layer)?.field].filter((f): f is string => !!f)))
  const fieldText = (row: Row, field: string) => anyText(row[field], valueFields.has(field) ? unit : undefined)
  const pointSlots: PlotSlot[] = []

  const barLayers = layers.filter(({ layer }) => layer.mark === "bar")
  layers.forEach(({ layer, series }, layerIndex) => {
    const d = domainOf(layer).field
    const v = valueOf(layer).field
    const v2 = value2Of(layer)?.field
    const multi = series.length > 1
    const showName = multi || drawn.length > 1
    const color = layer.encoding.color

    if (layer.mark === "rule") {
      for (const row of spec.data) {
        const raw = row[d]
        const a = row[v]
        const b = v2 ? row[v2] : null
        if (raw === null || raw === undefined || typeof a !== "number" || typeof b !== "number") continue
        const at = domainPos(raw)
        const [x1, y1] = place(at, valuePos(a))
        const [x2, y2] = place(at, valuePos(b))
        rules.push({ key: `r${layerIndex}-${rules.length}`, x1, y1, x2, y2, color: rowColor(color, row, fixedColor(color) ?? "muted"), slot: rawKeys.indexOf(raw) })
      }
      return
    }

    if (layer.mark === "text") {
      const field = layer.encoding.text?.field
      for (const row of spec.data) {
        const raw = row[d]
        const value = row[v]
        if (!field || raw === null || raw === undefined || typeof value !== "number") continue
        const at = domainPos(raw)
        const [x, y] = horizontal ? [valuePos(value) + 6, at + 3.5] : [at, valuePos(value) - 6]
        texts.push({ key: `t${layerIndex}-${texts.length}`, x, y, text: labelText(row[field], unit), color: color && "when" in color ? rowColor(color, row, "muted") : fixedColor(color) ?? "ink", anchor: horizontal ? "start" : "middle", slot: rawKeys.indexOf(raw) })
      }
      return
    }

    if (layer.mark === "bar") {
      const stacked = multi && layer.stack !== false && !v2
      const groups = stacked ? 1 : series.length
      const inner = band * 0.72
      const offsets = new Map<Raw, { pos: number; neg: number }>()
      const barIndex = barLayers.findIndex((b) => b.layer === layer)
      series.forEach((s, si) => {
        for (const row of s.rows) {
          const raw = row[d]
          const value = row[v]
          if (raw === null || raw === undefined || typeof value !== "number") continue
          const end = v2 ? row[v2] : null
          if (v2 && typeof end !== "number") continue
          const center = domainPos(raw)
          const size = inner / groups
          const start = center - inner / 2 + (stacked ? 0 : size * si)
          const offset = offsets.get(raw) ?? { pos: 0, neg: 0 }
          const from = v2 ? value : stacked ? (value >= 0 ? offset.pos : offset.neg) : 0
          const to = v2 ? (end as number) : from + value
          if (stacked) offsets.set(raw, value >= 0 ? { ...offset, pos: to } : { ...offset, neg: to })
          const a = valuePos(from)
          const b = valuePos(to)
          const slot = rawKeys.indexOf(raw)
          const fill = rowColor(color, row, s.color)
          // Las flotantes (velas, cascada) crecen desde su propio inicio; las demas, desde la base.
          const base = v2 ? a : baseline
          const label = horizontal && !stacked && !v2 ? valueText(value, unit) : undefined
          bars.push(
            horizontal
              ? { key: `b${barIndex}-${si}-${slot}`, x: Math.min(a, b), y: start, w: Math.max(Math.abs(b - a), v2 ? 1.5 : 0), h: size, color: fill, slot, base, label }
              : { key: `b${barIndex}-${si}-${slot}`, x: start, y: Math.min(a, b), w: size, h: Math.max(Math.abs(b - a), v2 ? 1.5 : 0), color: fill, slot, base, label },
          )
          // Una flotante (cascada) dice cuanto cambio, con su signo; las demas, su valor.
          const change = to - from
          addSlotValue(
            raw,
            v2
              ? { name: showName ? s.name : "Cambio", color: fill, text: `${change > 0 ? "+" : change < 0 ? "−" : ""}${valueText(Math.abs(change), unit)}` }
              : { name: showName ? s.name : valueOf(layer).title ?? v, color: fill, text: valueText(value, unit) },
          )
        }
      })
      return
    }

    // line, area, point
    const stackedArea = layer.mark === "area" && multi && layer.stack !== false
    const below = new Map<Raw, number>()
    series.forEach((s, si) => {
      const sorted = s.rows
        .filter((row) => row[d] !== null && row[d] !== undefined && typeof row[v] === "number")
        .sort((a, b) => rawKeys.indexOf(a[d] as Raw) - rawKeys.indexOf(b[d] as Raw))
      const coords: [number, number][] = []
      const floor: [number, number][] = []
      for (const row of sorted) {
        const raw = row[d] as Raw
        const value = row[v] as number
        const base = stackedArea ? (below.get(raw) ?? 0) : 0
        const top = base + value
        if (stackedArea) below.set(raw, top)
        const at = domainPos(raw)
        coords.push(place(at, valuePos(top)))
        // Sin cero en la escala, el area llega hasta el piso del grafico y no se sale por debajo.
        floor.push(place(at, valuePos(Math.min(Math.max(base, lo), hi))))
        const name = showName ? s.name : valueOf(layer).title ?? v
        const fill = rowColor(color, row, s.color)
        if (!scatter) addSlotValue(raw, { name, color: fill, text: valueText(value, unit) })
        if (layer.mark === "point" || layer.points) {
          const size = layer.encoding.size ? row[layer.encoding.size.field] : null
          const [cx, cy] = place(at, valuePos(top))
          const slot = scatter ? pointSlots.length : rawKeys.indexOf(raw)
          const point = { key: `p${layerIndex}-${si}-${rawKeys.indexOf(raw)}-${points.length}`, cx, cy, r: typeof size === "number" ? size : layer.mark === "point" ? 5 : 3.5, color: fill, slot }
          points.push(point)
          if (typeof size === "number") sizedPoints.add(point)
          if (scatter) {
            const xTitle = domainOf(layer).title
            const values = tooltip
              ? tooltip.map((field) => ({ name: field, color: fill, text: fieldText(row, field) }))
              : [{ name, color: fill, text: valueText(value, unit) }, ...(layer.encoding.size && typeof size === "number" ? [{ name: layer.encoding.size.field, color: fill, text: valueText(size, undefined) }] : [])]
            pointSlots.push({ pos: horizontal ? cy : cx, at: { x: cx, y: cy }, label: `${xTitle ? `${xTitle} ` : ""}${domainLabel(raw, domainOf(layer))}`, values })
          }
        }
      }
      if (layer.mark === "point" || coords.length === 0) return
      const path = layer.curve === "smooth" ? smoothPath(coords) : linearPath(coords)
      if (layer.mark === "area") {
        const back = [...floor].reverse()
        const closing = (layer.curve === "smooth" ? smoothPath(back) : linearPath(back)).replace(/^M/, "L")
        areas.push({ key: `a${layerIndex}-${si}`, d: `${path} ${closing} Z`, color: s.color })
      }
      lines.push({ key: `l${layerIndex}-${si}`, d: path, color: s.color })
    })
  })

  // Tamano de los puntos: un campo de tamano se escala a radios de 4 a 14.
  if (sizedPoints.size > 0) {
    const radii = [...sizedPoints].map((p) => p.r)
    const min = Math.min(...radii)
    const max = Math.max(...radii)
    for (const p of sizedPoints) p.r = 4 + (Math.sqrt(p.r - min) / Math.sqrt(max - min || 1)) * 10
  }

  // ---- anotaciones: lineas de referencia y textos que senalan un punto
  ;(spec.annotations ?? []).forEach((note, i) => {
    const tone = note.color ?? "accent"
    if (note.type === "rule") {
      if (note.axis === valueLetter) {
        if (typeof note.value !== "number") return
        const p = valuePos(note.value)
        const line = horizontal
          ? { x1: p, x2: p, y1: box.top, y2: box.bottom }
          : { x1: box.left, x2: box.right, y1: p, y2: p }
        const label = note.label
          ? horizontal
            ? { x: p > box.right - 70 ? p - 4 : p + 4, y: box.top + 9, text: note.label, anchor: (p > box.right - 70 ? "end" : "start") as "start" | "end" }
            : { x: box.right, y: p - 5, text: note.label, anchor: "end" as const }
          : undefined
        scene.refLines.push({ key: `n${i}`, ...line, color: tone, label })
      } else {
        const p = domainPosOf(note.value)
        if (p === null) return
        const line = horizontal ? { x1: box.left, x2: box.right, y1: p, y2: p } : { x1: p, x2: p, y1: box.top, y2: box.bottom }
        const label = note.label
          ? horizontal
            ? { x: box.right, y: p - 5, text: note.label, anchor: "end" as const }
            : { x: p > box.right - 70 ? p - 4 : p + 4, y: box.top + 9, text: note.label, anchor: (p > box.right - 70 ? "end" : "start") as "start" | "end" }
          : undefined
        scene.refLines.push({ key: `n${i}`, ...line, color: tone, label })
      }
      return
    }
    const domainRaw = horizontal ? note.y : note.x
    const value = horizontal ? note.x : note.y
    if (typeof value !== "number") return
    const p = domainPosOf(domainRaw)
    if (p === null) return
    const [x, y] = place(p, valuePos(value))
    const anchor = x < box.left + 50 ? "start" : x > box.right - 50 ? "end" : "middle"
    texts.push({ key: `n${i}`, x, y: y - 10 < box.top + 4 ? y + 18 : y - 10, text: note.text, color: tone, anchor, dot: { x, y } })
  })

  // Los textos van encima de toda la columna de barras de su lugar (o a la derecha, si son horizontales), nunca sobre una barra.
  for (const text of texts) {
    if (text.dot || text.slot === undefined) continue
    const column = bars.filter((bar) => bar.slot === text.slot)
    if (column.length === 0) continue
    if (horizontal) text.x = Math.max(text.x, Math.max(...column.map((bar) => bar.x + bar.w)) + 6)
    else text.y = Math.min(text.y, Math.min(...column.map((bar) => bar.y)) - 6)
  }

  // Marcas del dominio: todas si entran; si no, repartidas. En un eje numerico sin bandas, marcas redondas.
  const room = along / Math.max(...domainLabels.map((l) => measure(l) + 12), 1)
  const every = Math.max(1, Math.ceil(rawKeys.length / Math.max(room, 1)))
  scene.domainTicks =
    domainChannel.type === "quantitative" && !banded
      ? niceTicks(minNum, maxNum, Math.max(2, Math.floor(along / 70)))
          .filter((t) => t >= minNum && t <= maxNum)
          .map((t) => ({ pos: domainPos(t), label: domainLabel(t, domainChannel) }))
      : rawKeys.map((raw, i) => ({ pos: domainPos(raw), label: domainLabels[i] })).filter((_, i) => horizontal || i % every === 0 || i === rawKeys.length - 1)
  scene.valueTicks = ticks.map((t, i) => ({ pos: valuePos(t), label: valueLabels[i] }))
  scene.legend = palette.size > 1 ? [...palette].map(([name, color]) => ({ name, color })) : []

  if (scatter) {
    scene.slots = pointSlots
  } else {
    scene.slots = rawKeys.map((raw, i) => {
      const pos = domainPos(raw)
      // Con campos de tooltip (velas: o, h, l, c) se muestran esos campos de la fila.
      const row = tooltip ? spec.data.find((r) => String(r[domainOf(first).field]) === String(raw)) : undefined
      const fill = row ? rowColor(first.encoding.color, row, slotValues.get(raw)?.[0]?.color ?? "accent") : "accent"
      const values = row && tooltip ? tooltip.map((field) => ({ name: field, color: fill, text: fieldText(row, field) })) : slotValues.get(raw) ?? []
      return { pos, at: horizontal ? { x: box.right, y: pos } : { x: pos, y: box.top }, label: domainLabels[i], values }
    })
  }
  return scene
}

/** La grilla de calor: x e y son categorias (o fechas) y la intensidad sale de un valor. */
function buildGrid(spec: PlotSpec, width: number, height: number, measure: (text: string) => number): PlotScene {
  const [layer, ...rest] = spec.layers
  const x = layer.encoding.x!
  const y = layer.encoding.y!
  const color = layer.encoding.color as { field: string; value?: ColorToken }
  const tone = color.value ?? "accent"
  const unit = spec.axes?.y?.unit ?? spec.axes?.x?.unit
  const unique = (field: string) => [...new Set(spec.data.map((row) => row[field]).filter((v): v is Raw => v !== null && v !== undefined))]
  const xKeys = unique(x.field)
  if (x.type === "date") xKeys.sort((a, b) => day(String(a)) - day(String(b)))
  const yKeys = unique(y.field)
  const xLabels = xKeys.map((k) => domainLabel(k, x))
  const yLabels = yKeys.map((k) => domainLabel(k, y))
  const box: PlotBox = { left: Math.min(width * 0.32, Math.max(...yLabels.map(measure), 16) + 10), top: 4, right: width - 4, bottom: height - 22 }
  const cw = (box.right - box.left) / Math.max(xKeys.length, 1)
  const ch = (box.bottom - box.top) / Math.max(yKeys.length, 1)
  const values = spec.data.map((row) => row[color.field]).filter((v): v is number => typeof v === "number")
  const min = values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 1

  const scene = emptyScene("grid", width, height)
  scene.box = box
  scene.pick = "xy"
  const gap = Math.min(3, cw * 0.12, ch * 0.12)
  for (const row of spec.data) {
    const xi = xKeys.indexOf(row[x.field] as Raw)
    const yi = yKeys.indexOf(row[y.field] as Raw)
    if (xi < 0 || yi < 0) continue
    const value = row[color.field]
    const cell = { x: box.left + xi * cw + gap / 2, y: box.top + yi * ch + gap / 2, w: cw - gap, h: ch - gap }
    const slot = scene.slots.length
    scene.cells.push({
      key: `c${xi}-${yi}`,
      ...cell,
      color: tone,
      opacity: typeof value === "number" ? 0.12 + 0.88 * (max > min ? (value - min) / (max - min) : 1) : 0.05,
      slot,
      order: (xi + yi) / Math.max(xKeys.length + yKeys.length - 2, 1),
    })
    scene.slots.push({ pos: cell.x + cell.w / 2, at: { x: cell.x + cell.w / 2, y: cell.y + cell.h / 2 }, label: `${xLabels[xi]} · ${yLabels[yi]}`, values: [{ name: color.field, color: tone, text: anyText(value, unit) }] })
  }
  const text = rest.find((l) => l.mark === "text")?.encoding.text?.field
  if (text) {
    for (const cell of scene.cells) {
      const row = spec.data.filter((r) => xKeys.indexOf(r[x.field] as Raw) >= 0 && yKeys.indexOf(r[y.field] as Raw) >= 0)[cell.slot]
      if (row) scene.texts.push({ key: `t${cell.key}`, x: cell.x + cell.w / 2, y: cell.y + cell.h / 2 + 3.5, text: anyText(row[text], unit), color: "ink", anchor: "middle", slot: cell.slot })
    }
  }
  const room = (box.right - box.left) / Math.max(...xLabels.map((l) => measure(l) + 8), 1)
  const every = Math.max(1, Math.ceil(xKeys.length / Math.max(room, 1)))
  scene.domainTicks = xLabels.map((label, i) => ({ pos: box.left + i * cw + cw / 2, label })).filter((_, i) => i % every === 0)
  scene.valueTicks = yLabels.map((label, i) => ({ pos: box.top + i * ch + ch / 2, label }))
  scene.ramp = { color: tone, min: valueText(min, unit), max: valueText(max, unit) }
  return scene
}

/** La dona: una porcion por fila, con su parte del total. */
function buildArc(spec: PlotSpec, width: number, height: number): PlotScene {
  const layer = spec.layers[0]
  const theta = layer.encoding.theta!
  const colorField = (layer.encoding.color as { field: string }).field
  const rows = spec.data.filter((row) => typeof row[theta.field] === "number" && (row[theta.field] as number) > 0)
  const total = rows.reduce((sum, row) => sum + (row[theta.field] as number), 0)
  const scene = emptyScene("arc", width, height)
  const cx = width / 2
  const cy = height / 2
  // Margen para que la porcion tocada se pueda separar sin salirse.
  const r1 = Math.max(10, Math.min(width, height) / 2 - 10)
  const r0 = r1 * 0.62
  scene.center = { x: cx, y: cy, r0, r1, total: valueText(total, theta.unit) }
  scene.pick = "angle"
  let angle = TOP
  rows.forEach((row, i) => {
    const value = row[theta.field] as number
    const share = total > 0 ? value / total : 0
    const a0 = angle
    const a1 = angle + share * TAU
    angle = a1
    const mid = (a0 + a1) / 2
    const name = String(row[colorField] ?? "—")
    const color = SERIES[i % SERIES.length]
    scene.slices.push({ key: `s${i}`, d: arcPath(cx, cy, r0, r1, a0, a1), color, slot: i, a0, a1, mid, share })
    const r = (r0 + r1) / 2
    scene.slots.push({ pos: 0, at: { x: cx + Math.cos(mid) * r, y: cy + Math.sin(mid) * r }, label: name, values: [{ name, color, text: `${valueText(value, theta.unit)} · ${Math.round(share * 1000) / 10} %` }] })
    scene.legend.push({ name, color })
  })
  return scene
}

/** El punto de cursor mas cercano a una posicion (en el eje que recorre el cursor). */
export function nearestSlot(scene: PlotScene, pos: number): number {
  let best = 0
  let distance = Infinity
  scene.slots.forEach((slot, i) => {
    const d = Math.abs(slot.pos - pos)
    if (d < distance) {
      best = i
      distance = d
    }
  })
  return best
}

/** Lo que se elige al tocar en (x, y), en coordenadas del grafico; null si no cae sobre nada. */
export function pickAt(scene: PlotScene, x: number, y: number): number | null {
  if (scene.slots.length === 0) return null
  switch (scene.pick) {
    case "none":
      return null
    case "x":
      return nearestSlot(scene, x)
    case "y":
      return nearestSlot(scene, y)
    case "xy": {
      let best = 0
      let distance = Infinity
      scene.slots.forEach((slot, i) => {
        const d = Math.hypot(slot.at.x - x, slot.at.y - y)
        if (d < distance) {
          best = i
          distance = d
        }
      })
      return best
    }
    case "angle": {
      const c = scene.center!
      const d = Math.hypot(x - c.x, y - c.y)
      if (d < c.r0 * 0.6 || d > c.r1 + 14) return null
      let a = Math.atan2(y - c.y, x - c.x)
      if (a < TOP) a += TAU
      const found = scene.slices.find((s) => a >= s.a0 && a < s.a1)
      return found ? found.slot : null
    }
  }
}

/** Lo que lee el lector de pantalla: la conclusion y, si son pocos, los valores de cada punto. */
export function plotSummary(spec: PlotSpec, scene: PlotScene): string {
  const named = (slot: PlotSlot, v: PlotSlot["values"][number]) => v.name !== slot.label && (scene.legend.length > 0 || slot.values.length > 1)
  const detail = scene.slots.length <= 12 ? scene.slots.map((slot) => `${slot.label}: ${slot.values.map((v) => (named(slot, v) ? `${v.name} ${v.text}` : v.text)).join(", ")}`).join(". ") : ""
  return `Gráfico. ${spec.title}. ${spec.description}${detail ? `. ${detail}` : ""}`
}
