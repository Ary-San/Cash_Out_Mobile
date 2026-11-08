import { parseIsoDate } from "@/lib/dates"
import type { SavingsGoal } from "@/types/goals"

export const DAY = 86_400_000
const MONTH = 30.44 * DAY
// Ir unos dias detras del calendario no es estar atrasado (igual que en la web).
const PACE_SLACK = 0.05
// Con menos historia, el ritmo de un aporte suelto no dice nada: no se estima la fecha de llegada.
const MIN_HISTORY_DAYS = 14

export interface GoalPace {
  /** Parte del monto ya ahorrada, de 0 a 1. */
  progress: number
  late: boolean
  /** Lo que falta juntar. */
  remaining: number
  /** Lo que falta apartar cada mes para llegar a la fecha. */
  perMonth: number
  /** Cuando se llegaria al ritmo de aporte de hasta hoy; null sin aportes, con poca historia o ya cumplida. */
  eta: Date | null
  start: number
  /** Fin del plazo: termina el dia limite completo. */
  end: number
}

const clamp = (value: number) => Math.min(1, Math.max(0, value))

/** Fecha con hora del backend: viene en UTC y a veces sin la Z. */
export function serverDate(iso: string): Date {
  return new Date(/(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`)
}

/** El avance de una meta frente al tiempo que paso desde que se creo. */
export function goalPace(goal: SavingsGoal, now: Date = new Date()): GoalPace {
  const start = serverDate(goal.createdAt).getTime()
  const end = parseIsoDate(goal.deadline).getTime() + DAY
  const elapsed = clamp((now.getTime() - start) / Math.max(end - start, DAY))
  const progress = clamp(goal.accumulatedAmount / goal.targetAmount)
  const remaining = Math.max(Math.round((goal.targetAmount - goal.accumulatedAmount) * 100) / 100, 0)
  const days = (now.getTime() - start) / DAY
  const daily = goal.accumulatedAmount / Math.max(days, 1)
  return {
    progress,
    late: goal.status === "IN_PROGRESS" && progress < elapsed - PACE_SLACK,
    remaining,
    perMonth: Math.ceil(remaining / Math.max((end - now.getTime()) / MONTH, 1)),
    eta: days >= MIN_HISTORY_DAYS && daily > 0 && remaining > 0 ? new Date(now.getTime() + (remaining / daily) * DAY) : null,
    start,
    end,
  }
}

/** Las metas en curso, primero las que vencen antes. */
export function nearestGoals(goals: SavingsGoal[], limit = 2): SavingsGoal[] {
  return goals
    .filter((goal) => goal.status === "IN_PROGRESS")
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, limit)
}
