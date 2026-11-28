import type { ExpenseCategory } from "@/types/movements"

/** GET /budgets: un presupuesto con lo gastado en el mes. */
export interface Budget {
  category: ExpenseCategory
  name: string
  limit: number
  spent: number
  remaining: number
  /** De 0 en adelante: 1 es el presupuesto completo (puede pasarse). */
  share: number
}

/** GET /movements/report: el resumen del mes para el PDF. */
export interface MonthReport {
  month: string
  income: number
  expense: number
  net: number
  categories: { category: string; name: string; spent: number; limit: number | null }[]
  movements: { id: number; kind: "INCOME" | "EXPENSE"; label: string; category: string | null; amount: number; date: string }[]
}
