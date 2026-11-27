import { formatSoles } from "@/lib/format"
import type { AssistantBlock, BlockUnit, ChatTurn } from "@/types/financeAssistant"

/** Preguntas para empezar: muestran lo que el asistente sabe hacer. */
export const SUGGESTED_QUESTIONS = [
  "¿En qué gasté más este mes?",
  "Compara mis últimos 3 meses",
  "¿Voy a llegar a mi meta?",
  "¿Cómo va mi portafolio?",
]

/** Turnos que se mandan: el backend recorta igual, pero no tiene sentido mandar de mas. */
export const MAX_TURNS = 16

/** Para los ejes: sin centimos, que en cada marca solo hacen ruido ("S/ 1,400"). */
export function formatAxisValue(value: number, unit: BlockUnit): string {
  const whole = value.toLocaleString("es-PE", { maximumFractionDigits: 0 })
  if (unit === "PERCENT") return `${whole} %`
  if (unit === "TOKENS" || unit === "COUNT") return whole
  if (unit === "USD") return `US$ ${whole}`
  return `S/ ${whole}`
}

/** La conversacion que se manda: los ultimos turnos, terminando con la pregunta. */
export function turnsToSend(history: ChatTurn[], question: string): ChatTurn[] {
  return [...history, { role: "user" as const, content: question }].slice(-MAX_TURNS)
}

export type Inline = { text: string; bold: boolean }

/** Markdown minimo de las respuestas: **negritas** dentro de una linea. */
export function inlineParts(line: string): Inline[] {
  return line
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) => (part.startsWith("**") && part.endsWith("**") ? { text: part.slice(2, -2), bold: true } : { text: part, bold: false }))
}

export type Block = { kind: "paragraph"; text: string } | { kind: "bullet"; text: string }

/** Parrafos y vinetas ("- ", "• ", "* " o "1. "). Lo demas del markdown se muestra como texto. */
export function replyBlocks(reply: string): Block[] {
  return reply
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const bullet = /^(?:[-•*]|\d+[.)])\s+(.*)$/.exec(line)
      if (bullet) return { kind: "bullet" as const, text: bullet[1] }
      return { kind: "paragraph" as const, text: line.replace(/^#+\s*/, "") }
    })
}

/** El mensaje para el chat cuando el asistente no pudo responder. */
export function assistantErrorMessage(error: { status?: number; serverMessage?: string }, fallback: string): string {
  if (error.status === 429) return "Llegaste al límite de preguntas de hoy. Mañana puedes seguir."
  if (error.status === 503) return "El asistente no está disponible ahora. Intenta en un rato."
  return fallback
}

const plainNumber = (value: number, digits = 2) => value.toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: digits })

/** Una cifra con su unidad: "S/ 1,250.50", "US$ 238.00", "12.5 %", "135 fichas", "8". */
export function formatValue(value: number, unit: BlockUnit): string {
  switch (unit) {
    case "PEN":
      return formatSoles(value)
    case "USD":
      return `US$ ${value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    case "PERCENT":
      return `${plainNumber(value, 1)} %`
    case "TOKENS":
      return `${plainNumber(value)} fichas`
    case "COUNT":
      return plainNumber(value, 0)
  }
}

/** "−26 %" / "+12 %" a partir de la fraccion, con el signo de verdad. */
export function formatDelta(delta: number): string {
  const percent = Math.round(delta * 1000) / 10
  return `${percent > 0 ? "+" : percent < 0 ? "−" : ""}${plainNumber(Math.abs(percent), 1)} %`
}

/** Si la variacion es buena, mala o neutra, segun si subir es bueno en esa cifra. */
export function deltaTone(delta: number | undefined, higherIsGood: boolean | undefined): "gain" | "loss" | "neutral" {
  if (delta === undefined || delta === 0 || higherIsGood === undefined) return "neutral"
  return (delta > 0) === higherIsGood ? "gain" : "loss"
}

/** "21 nov" a partir de "2026-11-21", sin correr el dia por la zona horaria. */
export function shortDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString("es-PE", { day: "numeric", month: "short" })
}

/** Lo que el lector de pantalla dice de un bloque visual (el texto se lee tal cual). */
export function blockSummary(block: AssistantBlock): string {
  switch (block.kind) {
    case "text":
      return block.markdown.replace(/\*\*/g, "")
    case "metrics":
      return block.items.map((item) => `${item.label}: ${formatValue(item.value, item.unit)}${item.delta !== undefined ? `, ${formatDelta(item.delta)}${item.deltaLabel ? ` ${item.deltaLabel}` : ""}` : ""}`).join(". ")
    case "table":
      return `Tabla con ${block.rows.length} filas. ` + block.rows.map((row) => block.columns.map((column) => `${column.label}: ${cell(row[column.key], column.unit)}`).join(", ")).join(". ")
    case "ranking":
      return block.items.map((item, i) => `${i + 1}. ${item.label}: ${formatValue(item.value, block.unit)}`).join(". ")
    case "comparison":
      return [block.left, block.right].map((side) => `${side.title}: ${side.items.map((item) => `${item.label} ${formatValue(item.value, item.unit)}`).join(", ")}`).join(". ") + (block.verdict ? `. ${block.verdict}` : "")
    case "timeline":
      return block.items.map((item) => `${shortDate(item.date)}: ${item.title}`).join(". ")
    case "callout":
      return block.markdown.replace(/\*\*/g, "")
    case "steps":
      return block.items.map((item, i) => `Paso ${i + 1}: ${item.title}`).join(". ")
    case "plot":
      return `Gráfico. ${block.spec.title}. ${block.spec.description}`
  }
}

/** Una celda de tabla: los numeros con la unidad de su columna. */
export function cell(value: string | number | null | undefined, unit?: BlockUnit): string {
  if (value === null || value === undefined) return "—"
  return typeof value === "number" && unit ? formatValue(value, unit) : String(value)
}

/** Los turnos para el historial: de la respuesta del asistente solo va el texto plano. */
export function historyOf(messages: { role: "user" | "assistant"; content: string }[]): ChatTurn[] {
  return messages.map(({ role, content }) => ({ role, content }))
}
