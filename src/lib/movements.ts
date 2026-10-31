import type { Expense, Income, Movement } from "@/types/movements"

export type MovementFilter = "ALL" | "EXPENSE" | "INCOME"

/** Un gasto con la forma del listado unificado, para pintarlo con la misma fila. */
export function expenseToMovement(expense: Expense): Movement {
  return { ...expense, kind: "EXPENSE", label: expense.description }
}

export function incomeToMovement(income: Income): Movement {
  return { ...income, kind: "INCOME", label: income.source, category: null }
}

/** Gastos e ingresos tienen secuencias propias: el id solo es unico junto con el tipo. */
export function movementKey(movement: Movement): string {
  return `${movement.kind}-${movement.id}`
}
