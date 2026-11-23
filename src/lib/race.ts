import type { RaceView } from "@/types/race"

/** Las cuotas que se pueden elegir al crear la sala, en fichas. */
export const RACE_FEES = [0, 10, 20, 50] as const

export const RACE_FRACTIONS = [
  { value: 0.25, label: "25 %" },
  { value: 0.5, label: "50 %" },
  { value: 1, label: "Todo" },
] as const

export const RACE_RULES = [
  "Todos operan la misma moneda misteriosa, con precios reales de un día movido del mercado.",
  "Seis horas de mercado pasan en 90 segundos: cada segundo son 4 minutos.",
  "Empiezas con 10 000 puntos y decides cuándo comprar y vender.",
  "Gana quien termine con más. El pozo se reparte 50 / 30 / 20 entre los tres primeros.",
  "Si son menos de 3 jugadores no hay premio: se devuelve la cuota.",
]

/**
 * Junta una vista nueva con la anterior. Los ticks (4 por segundo) no traen la
 * serie de precios para no reenviarla entera: el precio del paso se agrega a la
 * que ya se tenia. La misma regla que la web.
 */
export function mergeRaceView(prev: RaceView | null, next: RaceView): RaceView {
  if (next.prices) return next
  const known = prev?.code === next.code ? (prev.prices ?? []) : []
  const prices = next.step >= known.length ? [...known, next.price] : known.slice(0, next.step + 1)
  return { ...next, prices }
}

/** "2020-03-12" → "12 de marzo de 2020". */
export function formatRaceDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number)
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)))
}

/** Con menos de 3 jugadores no hay premio: la cuota se devuelve. */
export function raceRefunded(view: RaceView): boolean {
  return view.ranking.length < 3 && view.entryFee > 0
}
