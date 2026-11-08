import { addDays, parseIsoDate, todayIso } from "@/lib/dates"
import type { ExpenseCategory, Movement } from "@/types/movements"

// Calculos de presentacion copiados de la web (lib/monthPace): el saldo sigue viniendo del backend.

export interface CategoryTotal {
  category: ExpenseCategory
  total: number
  /** Parte del gasto del mes, de 0 a 1. */
  share: number
}

export interface MonthPace {
  day: number
  spent: number
  earned: number
  /** Lo gastado el mes pasado hasta el mismo dia. */
  previousToDate: number
  /** Variacion del gasto contra el mes pasado al mismo dia, en %; null si el mes pasado no hubo gasto. */
  change: number | null
  /** Gasto acumulado dia a dia: este mes hasta hoy y el mes pasado completo. */
  cumulative: number[]
  previousCumulative: number[]
  categories: CategoryTotal[]
}

const cents = (value: number) => Math.round(value * 100) / 100
const dayOf = (iso: string) => Number(iso.slice(8, 10))

/** "2026-11" a partir de una fecha yyyy-MM-dd. */
export const monthOf = (iso: string) => iso.slice(0, 7)

/** El mes anterior a "2026-01" es "2025-12". */
export const previousMonthOf = (month: string) => monthOf(addDays(`${month}-01`, -1))

export function daysInMonth(month: string): number {
  const date = parseIsoDate(`${month}-01`)
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

export function monthRange(month: string): { from: string; to: string } {
  return { from: `${month}-01`, to: `${month}-${String(daysInMonth(month)).padStart(2, "0")}` }
}

function cumulativeSpend(movements: Movement[], days: number): number[] {
  const perDay = new Array<number>(days).fill(0)
  for (const m of movements) if (m.kind === "EXPENSE") perDay[dayOf(m.date) - 1] += m.amount
  let sum = 0
  return perDay.map((value) => (sum = cents(sum + value)))
}

/** Como va el mes contra el mes pasado a la misma altura. */
export function monthPace(current: Movement[], previous: Movement[], month: string, today = todayIso()): MonthPace {
  const days = daysInMonth(month)
  const day = today.startsWith(month) ? dayOf(today) : days
  const previousDays = daysInMonth(previousMonthOf(month))
  const sameDay = Math.min(day, previousDays)

  let spent = 0
  let earned = 0
  const byCategory = new Map<ExpenseCategory, number>()
  for (const m of current) {
    if (m.kind === "INCOME") {
      earned += m.amount
      continue
    }
    spent += m.amount
    const category = m.category ?? "OTHER"
    byCategory.set(category, cents((byCategory.get(category) ?? 0) + m.amount))
  }
  spent = cents(spent)
  const previousToDate = cents(
    previous.filter((m) => m.kind === "EXPENSE" && dayOf(m.date) <= sameDay).reduce((sum, m) => sum + m.amount, 0),
  )

  return {
    day,
    spent,
    earned: cents(earned),
    previousToDate,
    change: previousToDate > 0 ? ((spent - previousToDate) / previousToDate) * 100 : null,
    cumulative: cumulativeSpend(current, days).slice(0, day),
    previousCumulative: cumulativeSpend(previous, previousDays),
    categories: [...byCategory]
      .map(([category, total]) => ({ category, total, share: spent > 0 ? total / spent : 0 }))
      .sort((a, b) => b.total - a.total),
  }
}
