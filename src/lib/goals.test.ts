import { goalPace } from "@/lib/goalPace"
import { completionReward, contributionsByMonth, groupGoals, monthsFromToday, validateGoalForm } from "@/lib/goals"
import type { SavingsGoal } from "@/types/goals"

const goal = (over: Partial<SavingsGoal>): SavingsGoal => ({
  id: 1, name: "Laptop", targetAmount: 1000, accumulatedAmount: 250, progressPercent: 25, deadline: "2027-06-30",
  status: "IN_PROGRESS", completedAt: null, createdAt: "2026-09-01T00:00:00", ...over,
})

describe("validateGoalForm", () => {
  const goals = [goal({}), goal({ id: 2, name: "Celular" })]
  const today = "2026-11-07"

  it("no deja repetir un nombre, sin importar mayusculas", () => {
    expect(validateGoalForm({ name: "laptop", target: "500", deadline: "2027-01-01" }, goals, undefined, today).name)
      .toBe('Ya tienes una meta llamada "laptop".')
  })

  it("al editar, el mismo nombre vale y el objetivo no baja de lo aportado", () => {
    const errors = validateGoalForm({ name: "Laptop", target: "200", deadline: "2027-01-01" }, goals, goals[0], today)
    expect(errors.name).toBeUndefined()
    // Intl separa "S/" del monto con un espacio duro: se compara normalizando los espacios.
    expect(errors.target?.replace(/\s/g, " ")).toBe("No puede ser menor a lo ya aportado (S/ 250.00).")
  })

  it("la fecha tiene que ser posterior a hoy, pero sin tope", () => {
    expect(validateGoalForm({ name: "Viaje", target: "500", deadline: today }, goals, undefined, today).deadline)
      .toBe("La fecha límite tiene que ser posterior a hoy.")
    expect(validateGoalForm({ name: "Viaje", target: "500", deadline: "2035-12-31" }, goals, undefined, today)).toEqual({})
  })

  it("los atajos de plazo cuentan meses desde hoy", () => {
    expect(monthsFromToday(12, "2026-11-07")).toBe("2027-11-07")
  })
})

describe("metas", () => {
  it("al cumplir se gana el 1 % del objetivo, hasta 100 fichas (como el backend)", () => {
    expect(completionReward(1000)).toBe(10)
    expect(completionReward(50_000)).toBe(100)
    expect(completionReward(333)).toBe(3.33)
  })

  it("agrupa por año de vencimiento y junta las terminadas", () => {
    const list = [goal({ id: 1, deadline: "2026-12-15" }), goal({ id: 2, deadline: "2027-06-30" }),
      goal({ id: 3, status: "COMPLETED" }), goal({ id: 4, status: "EXPIRED" })]
    const sections = groupGoals(list, "fecha", "IN_PROGRESS", "2026-11-07")
    expect(sections.map((s) => s.goals.map((g) => g.id))).toEqual([[1], [2], [3, 4]])
    expect(groupGoals(list, "estado", "EXPIRED")[0].goals.map((g) => g.id)).toEqual([4])
  })

  it("suma los aportes por mes en los ultimos 6", () => {
    const months = contributionsByMonth([
      { id: 1, amount: 100, source: "MANUAL", createdAt: "2026-11-01T15:00:00" },
      { id: 2, amount: 50, source: "INCOME", createdAt: "2026-10-15T15:00:00" },
    ], new Date("2026-11-07T12:00:00"))
    expect(months.map((m) => m.total)).toEqual([0, 0, 0, 0, 50, 100])
    expect(months[5].label).toBe("nov")
  })

  it("no estima la llegada con menos de dos semanas de historia", () => {
    const now = new Date("2026-11-07T12:00:00Z")
    expect(goalPace(goal({ createdAt: "2026-11-01T00:00:00" }), now).eta).toBeNull()
    expect(goalPace(goal({}), now).eta).not.toBeNull()
  })
})
