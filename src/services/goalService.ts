import { http } from "@/api/client"
import type { Contribution, SavingsGoal, SavingsGoalInput } from "@/types/goals"

/** Metas de ahorro y sus aportes. Saldo, avance y estado los calcula el backend. */
export const goalService = {
  async list(signal?: AbortSignal): Promise<SavingsGoal[]> {
    const { data } = await http.get<SavingsGoal[]>("/savings-goals", { signal })
    return data
  },

  async get(id: number, signal?: AbortSignal): Promise<SavingsGoal> {
    const { data } = await http.get<SavingsGoal>(`/savings-goals/${id}`, { signal })
    return data
  },

  async create(input: SavingsGoalInput): Promise<SavingsGoal> {
    const { data } = await http.post<SavingsGoal>("/savings-goals", input)
    return data
  },

  async update(id: number, input: SavingsGoalInput): Promise<SavingsGoal> {
    const { data } = await http.put<SavingsGoal>(`/savings-goals/${id}`, input)
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/savings-goals/${id}`)
  },

  async contributions(id: number, signal?: AbortSignal): Promise<Contribution[]> {
    const { data } = await http.get<Contribution[]>(`/savings-goals/${id}/contributions`, { signal })
    return data
  },

  async contribute(id: number, amount: number): Promise<Contribution> {
    const { data } = await http.post<Contribution>(`/savings-goals/${id}/contributions`, { amount, source: "MANUAL" })
    return data
  },
}
