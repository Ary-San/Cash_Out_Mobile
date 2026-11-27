/** GET /finance-assistant/status */
export interface AssistantStatus {
  /** false si el servidor no tiene la clave de Claude: el asistente no responde. */
  available: boolean
  /** Preguntas que quedan hoy. */
  remaining: number
}

/** Un turno de la conversacion. La guarda la app: el servidor no guarda chats. */
export interface ChatTurn {
  role: "user" | "assistant"
  content: string
}

/** La unidad de una cifra de un bloque. */
export type BlockUnit = "PEN" | "USD" | "PERCENT" | "TOKENS" | "COUNT"

export interface MetricItem {
  label: string
  value: number
  unit: BlockUnit
  /** Variacion como fraccion: -0.26 es -26 %. */
  delta?: number
  deltaLabel?: string
  /** true si subir es bueno (ahorro); false si es malo (gastos). */
  higherIsGood?: boolean
}

export interface TableColumn {
  key: string
  label: string
  unit?: BlockUnit
}

/** Un bloque de la respuesta del asistente, en el orden en que va. */
export type AssistantBlock =
  | { kind: "text"; markdown: string }
  | { kind: "metrics"; id: string; items: MetricItem[] }
  | { kind: "table"; id: string; columns: TableColumn[]; rows: Record<string, string | number | null>[]; caption?: string }
  | { kind: "ranking"; id: string; unit: BlockUnit; items: { label: string; value: number; detail?: string }[] }
  | { kind: "comparison"; id: string; left: ComparisonSide; right: ComparisonSide; verdict?: string }
  | { kind: "timeline"; id: string; items: { date: string; title: string; detail?: string; tone: "gain" | "loss" | "neutral" }[] }
  | { kind: "callout"; id: string; tone: "tip" | "warning" | "info" | "success"; markdown: string }
  | { kind: "steps"; id: string; items: { title: string; detail?: string }[] }
  | { kind: "plot"; id: string; spec: PlotSpec }

export interface ComparisonSide {
  title: string
  items: { label: string; value: number; unit: BlockUnit }[]
}

/** POST /finance-assistant/chat */
export interface ChatReply {
  /** El texto plano, sin bloques: para el lector de pantalla y el historial. */
  reply: string
  /** La respuesta como bloques en orden: texto y, solo si hacen falta, cifras, tablas, graficos... */
  blocks: AssistantBlock[]
  remaining: number
}

/** Un canal de la gramatica de graficos: que campo va en un eje y de que tipo es. */
export interface PlotChannel {
  field: string
  type: "quantitative" | "category" | "date"
  title?: string
}

export type ColorToken = "series-1" | "series-2" | "series-3" | "series-4" | "series-5" | "series-6" | "series-7" | "gain" | "loss" | "income" | "expense" | "accent" | "muted"

/** El color de una capa: una serie por valor de un campo, un token fijo o un color por fila segun una comparacion. */
export type PlotColor = { field: string; value?: ColorToken } | { value: ColorToken } | { when: string; then: ColorToken; else: ColorToken }

export interface PlotLayer {
  mark: "bar" | "line" | "area" | "point" | "rule" | "rect" | "arc" | "text"
  /** x e y faltan solo en arc (la dona usa theta y color). */
  encoding: {
    x?: PlotChannel
    y?: PlotChannel
    /** Extremos: barras flotantes (cascada, velas) y reglas. */
    x2?: { field: string }
    y2?: { field: string }
    color?: PlotColor
    size?: { field: string }
    theta?: { field: string; unit?: BlockUnit }
    text?: { field: string }
  }
  curve?: "smooth"
  points?: true
  stack?: false
}

/** Una linea de referencia (objetivo, presupuesto) o un texto que senala un punto. */
export type PlotAnnotation =
  | { type: "rule"; axis: "x" | "y"; value: number | string; label?: string; color?: ColorToken }
  | { type: "label"; x: number | string; y: number | string; text: string; color?: ColorToken }

export interface PlotAxis {
  title?: string
  unit?: BlockUnit
  zero?: boolean
}

/** Un grafico armado por el asistente con la gramatica de Cash-Out: datos en linea, capas, marcas y canales. */
export interface PlotSpec {
  title: string
  /** La conclusion del grafico en una frase (para el lector de pantalla). */
  description: string
  data: Record<string, string | number | null>[]
  layers: PlotLayer[]
  axes?: { x?: PlotAxis; y?: PlotAxis }
  annotations?: PlotAnnotation[]
  interaction?: { cursor?: "x" | "none"; tooltip?: string[]; highlight?: boolean }
}
