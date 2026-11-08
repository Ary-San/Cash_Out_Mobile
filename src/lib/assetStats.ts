import { parseIsoDate } from "@/lib/dates"
import type { PricePoint } from "@/types/market"

export type ChartRange = "1M" | "3M" | "6M" | "1A" | "5A" | "MAX"

export const CHART_RANGES: { key: ChartRange; label: string; months: number; description: string }[] = [
  { key: "1M", label: "1M", months: 1, description: "en el último mes" },
  { key: "3M", label: "3M", months: 3, description: "en los últimos 3 meses" },
  { key: "6M", label: "6M", months: 6, description: "en los últimos 6 meses" },
  { key: "1A", label: "1A", months: 12, description: "en el último año" },
  { key: "5A", label: "5A", months: 60, description: "en los últimos 5 años" },
  { key: "MAX", label: "Máx", months: Infinity, description: "desde el primer cierre" },
]

/** "2026-10-02" − 3 meses → "2026-07-02". El 31 cae al ultimo dia del mes si no existe. */
export function addMonths(iso: string, months: number): string {
  const date = parseIsoDate(iso)
  const day = date.getDate()
  date.setDate(1)
  date.setMonth(date.getMonth() + months)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, lastDay))
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

/** Los cierres del rango, contado desde el ultimo cierre: un fin de semana no achica el grafico. */
export function inRange(points: readonly PricePoint[], range: ChartRange): PricePoint[] {
  const last = points[points.length - 1]
  if (!last) return []
  const months = CHART_RANGES.find((r) => r.key === range)?.months ?? 1
  const start = Number.isFinite(months) ? addMonths(last.date, -months) : ""
  return points.filter((point) => point.date >= start)
}

/** Variacion en % entre el primer y el ultimo cierre; null con menos de dos. */
export function changeOf(points: readonly PricePoint[]): number | null {
  const first = points[0]?.closePrice
  const last = points[points.length - 1]?.closePrice
  return points.length > 1 && first ? ((last - first) / first) * 100 : null
}

export interface RangeReturn {
  range: ChartRange
  label: string
  value: number | null
  /** El mismo rango del S&P 500, si se tiene. */
  benchmark: number | null
}

/** Cuanto rindio en cada rango; uno sin historia suficiente queda en null. */
export function returnsByRange(points: readonly PricePoint[], benchmark?: readonly PricePoint[]): RangeReturn[] {
  const firstDate = points[0]?.date
  return CHART_RANGES.map(({ key, label }) => {
    const slice = inRange(points, key)
    // Si el historial empieza despues del inicio del rango, la cifra seria de un periodo mas corto.
    const complete = firstDate !== undefined && slice[0]?.date !== firstDate
    return {
      range: key,
      label,
      value: complete || key === "5A" || key === "MAX" ? changeOf(slice) : null,
      benchmark: benchmark ? changeOf(inRange(benchmark, key)) : null,
    }
  })
}

export interface YearStats {
  low: number
  high: number
  /** Desviacion de los retornos diarios llevada a un año, en %. */
  volatility: number | null
  /** La mayor caida desde un maximo dentro del año, en % (negativa). */
  maxDrawdown: number
  /** Cuanto falta para volver al maximo, en % (0 o negativa). */
  fromHigh: number
}

const TRADING_DAYS = 252

export function yearStats(points: readonly PricePoint[], price?: number): YearStats | null {
  const year = inRange(points, "1A").map((point) => point.closePrice)
  if (year.length < 2) return null
  const current = price ?? year[year.length - 1]
  const low = Math.min(...year, current)
  const high = Math.max(...year, current)

  const returns = year.slice(1).map((value, i) => Math.log(value / year[i]))
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / Math.max(1, returns.length - 1)
  const volatility = returns.length > 20 ? Math.sqrt(variance) * Math.sqrt(TRADING_DAYS) * 100 : null

  let peak = year[0]
  let maxDrawdown = 0
  for (const value of year) {
    peak = Math.max(peak, value)
    maxDrawdown = Math.min(maxDrawdown, (value / peak - 1) * 100)
  }
  return { low, high, volatility, maxDrawdown, fromHigh: (current / high - 1) * 100 }
}
