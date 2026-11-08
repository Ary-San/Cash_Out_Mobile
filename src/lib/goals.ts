import { addDays, isIsoDate, todayIso } from "@/lib/dates"
import { formatDate, formatSoles } from "@/lib/format"
import { DAY, serverDate, type GoalPace } from "@/lib/goalPace"
import type { Contribution, ContributionSource, SavingsGoal } from "@/types/goals"

/** El dia local (yyyy-MM-dd) de una fecha con hora del backend, que llega en UTC. */
export function serverDay(iso: string): string {
  const d = serverDate(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export const SOURCE_LABEL: Record<ContributionSource, string> = {
  MANUAL: "Aporte manual",
  INCOME: "Desde un ingreso",
  ADJUSTMENT: "Ajuste",
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"]
const MONTHS_LONG = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"]

/** "junio" o "junio de 2027" si no es este año. */
export function monthName(date: Date, now = new Date()): string {
  const name = MONTHS_LONG[date.getMonth()]
  return date.getFullYear() === now.getFullYear() ? name : `${name} de ${date.getFullYear()}`
}

/** Lo que el backend acredita al cumplir: 1 % del objetivo, hasta 100 fichas (ContributionService). */
export function completionReward(target: number): number {
  return Math.floor(Math.min(target * 0.01, 100) * 100) / 100
}

/** Una linea que dice como va la meta, con el estado que manda el backend. */
export function goalStatusText(goal: SavingsGoal, pace: GoalPace): string {
  if (goal.status === "COMPLETED") return goal.completedAt ? `Cumplida el ${formatDate(serverDay(goal.completedAt))}` : "Cumplida"
  if (goal.status === "EXPIRED") return `Venció el ${formatDate(goal.deadline)} sin completarse`
  if (pace.late) return `Atrasada: aparta ${formatSoles(pace.perMonth)} al mes`
  return `En camino · vence el ${formatDate(goal.deadline)}`
}

export type GoalGrouping = "estado" | "fecha"
export type GoalFilter = "IN_PROGRESS" | "COMPLETED" | "EXPIRED"

export interface GoalSection {
  title: string
  goals: SavingsGoal[]
  empty: string
}

/** Como el tablero de la web: por estado, o las en curso segun el año en que vencen. */
export function groupGoals(goals: SavingsGoal[], grouping: GoalGrouping, filter: GoalFilter, today = todayIso()): GoalSection[] {
  const byDeadline = (a: SavingsGoal, b: SavingsGoal) => a.deadline.localeCompare(b.deadline)
  const inProgress = goals.filter((g) => g.status === "IN_PROGRESS").sort(byDeadline)
  const done = goals.filter((g) => g.status !== "IN_PROGRESS")
  if (grouping === "estado") {
    const empty = { IN_PROGRESS: "Crea una meta con el botón de abajo.", COMPLETED: "Cuando cumplas una meta, la verás aquí.", EXPIRED: "Ninguna meta venció sin completarse." }
    return [{ title: "", goals: filter === "IN_PROGRESS" ? inProgress : goals.filter((g) => g.status === filter), empty: empty[filter] }]
  }
  const year = today.slice(0, 4)
  return [
    { title: `Vencen en ${year}`, goals: inProgress.filter((g) => g.deadline.slice(0, 4) <= year), empty: "Ninguna vence este año." },
    { title: `Vencen después de ${year}`, goals: inProgress.filter((g) => g.deadline.slice(0, 4) > year), empty: "Ninguna vence más adelante." },
    { title: "Terminadas", goals: done, empty: "Todavía ninguna terminó." },
  ]
}

/** Lo aportado en cada uno de los ultimos `count` meses, del mas antiguo al actual. */
export function contributionsByMonth(contributions: Contribution[], now = new Date(), count = 6): { label: string; total: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const month = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1)
    const total = contributions
      .filter((c) => {
        const d = serverDate(c.createdAt)
        return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth()
      })
      .reduce((sum, c) => sum + c.amount, 0)
    return { label: MONTHS[month.getMonth()], total }
  })
}

export interface ForecastChart {
  /** Lo aportado, en escalones: un salto por aporte. */
  actual: string
  /** De hoy a la fecha estimada, a este ritmo. */
  projection: string
  targetY: number
  deadlineX: number
  todayX: number
  todayY: number
}

/** Puntos del grafico "Hacia donde vas" en un lienzo de `width` x `height`. */
export function forecastChart(goal: SavingsGoal, contributions: Contribution[], pace: GoalPace, width: number, height: number, now = new Date()): ForecastChart {
  const endT = Math.max(pace.end, pace.eta?.getTime() ?? 0, now.getTime()) + 10 * DAY
  const x = (t: number) => Math.round(((t - pace.start) / (endT - pace.start)) * width * 10) / 10
  const y = (v: number) => Math.round((height - 6 - (v / goal.targetAmount) * (height - 18)) * 10) / 10
  const points: [number, number][] = [[x(pace.start), y(0)]]
  let sum = 0
  for (const c of [...contributions].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const t = serverDate(c.createdAt).getTime()
    points.push([x(t), y(sum)])
    sum += c.amount
    points.push([x(t), y(sum)])
  }
  points.push([x(now.getTime()), y(goal.accumulatedAmount)])
  const projection: [number, number][] = pace.eta
    ? [[x(now.getTime()), y(goal.accumulatedAmount)], [x(pace.eta.getTime()), y(goal.targetAmount)]]
    : []
  const join = (list: [number, number][]) => list.map((p) => p.join(",")).join(" ")
  return {
    actual: join(points),
    projection: join(projection),
    targetY: y(goal.targetAmount),
    deadlineX: x(pace.end - DAY),
    todayX: x(now.getTime()),
    todayY: y(goal.accumulatedAmount),
  }
}

export interface GoalFormValues {
  name: string
  target: string
  deadline: string
}

export type GoalFormErrors = Partial<Record<keyof GoalFormValues, string>>

/** Lo mismo que valida el backend, para avisar antes de enviar. */
export function validateGoalForm(values: GoalFormValues, goals: SavingsGoal[], editing?: SavingsGoal, today = todayIso()): GoalFormErrors {
  const errors: GoalFormErrors = {}
  const name = values.name.trim()
  const target = Number(values.target.replace(",", "."))
  if (!name) errors.name = "Ponle un nombre a tu meta."
  else if (name.length > 120) errors.name = "El nombre no puede tener más de 120 caracteres."
  else if (goals.some((g) => g.name.toLowerCase() === name.toLowerCase() && g.id !== editing?.id)) {
    errors.name = `Ya tienes una meta llamada "${name}".`
  }
  if (!values.target.trim() || !(target > 0)) errors.target = "Escribe un monto mayor que cero."
  else if (editing && target < editing.accumulatedAmount) {
    errors.target = `No puede ser menor a lo ya aportado (${formatSoles(editing.accumulatedAmount)}).`
  }
  if (!isIsoDate(values.deadline)) errors.deadline = "Elige la fecha límite."
  else if (values.deadline < addDays(today, 1)) errors.deadline = "La fecha límite tiene que ser posterior a hoy."
  return errors
}

/** Cuanto apartar al mes para juntar `amount` antes de `deadline`. */
export function monthlyPlan(amount: number, deadline: string, now = new Date()): { months: number; perMonth: number } {
  const months = Math.max(1, Math.round((new Date(`${deadline}T12:00:00`).getTime() - now.getTime()) / (30.44 * DAY)))
  return { months, perMonth: Math.ceil(amount / months) }
}

/** yyyy-MM-dd dentro de `months` meses. */
export function monthsFromToday(months: number, today = todayIso()): string {
  const [y, m, d] = today.split("-").map(Number)
  const date = new Date(y, m - 1 + months, d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}
