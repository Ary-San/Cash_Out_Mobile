import { http } from "@/api/client"
import type { Budget } from "@/types/budgets"
import type { ExpenseCategory } from "@/types/movements"

/** Los presupuestos por categoria. */
export const budgetService = {
  async list(signal?: AbortSignal): Promise<Budget[]> {
    const { data } = await http.get<Budget[]>("/budgets", { signal })
    return data
  },

  async set(category: ExpenseCategory, amount: number): Promise<Budget> {
    const { data } = await http.put<Budget>(`/budgets/${category.toLowerCase()}`, { amount })
    return data
  },

  async remove(category: ExpenseCategory): Promise<void> {
    await http.delete(`/budgets/${category.toLowerCase()}`)
  },
}
