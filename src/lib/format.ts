import { parseIsoDate } from "@/lib/dates"

// Solo formato: los saldos los calcula el backend, nunca el cliente.
const soles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** 1234.5 → "S/ 1,234.50" */
export function formatSoles(amount: number | null | undefined): string {
  return soles.format(amount ?? 0)
}

/** "2026-10-28" → "28 oct 2026", sin correr el dia por la zona horaria. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  return parseIsoDate(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" })
}

/** "Ana María Torres" → "Ana"; sin nombre, un saludo que igual funciona. */
export function firstName(name: string | null | undefined): string {
  return name?.trim().split(/\s+/)[0] || "de nuevo"
}

/** "Ana María Torres" → "AT": la primera letra del primer y del ultimo nombre. */
export function initials(name: string | null | undefined): string {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? []
  if (words.length === 0) return "?"
  const last = words.length > 1 ? words[words.length - 1][0] : ""
  return (words[0][0] + last).toUpperCase()
}

/** "miércoles 28 de octubre", con la primera letra en mayuscula. */
export function longToday(now: Date = new Date()): string {
  const text = now.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })
  return text.charAt(0).toUpperCase() + text.slice(1)
}
