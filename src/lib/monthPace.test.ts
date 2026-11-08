import { goalPace, nearestGoals } from "@/lib/goalPace"
import { daysInMonth, monthPace, previousMonthOf } from "@/lib/monthPace"
import type { SavingsGoal } from "@/types/goals"
import type { Movement } from "@/types/movements"

const move = (date: string, amount: number, kind: Movement["kind"] = "EXPENSE", category: Movement["category"] = "FOOD"): Movement => ({
  id: Math.random(), kind, label: null, category: kind === "INCOME" ? null : category, amount, date, createdAt: `${date}T12:00:00`,
})

describe("monthPace", () => {
  it("compara con el mes pasado hasta el mismo dia y ordena las categorias", () => {
    const current = [move("2026-11-02", 20), move("2026-11-05", 40, "EXPENSE", "TRANSPORT"), move("2026-11-03", 500, "INCOME")]
    const previous = [move("2026-10-01", 50), move("2026-10-07", 30), move("2026-10-20", 300)]

    const pace = monthPace(current, previous, "2026-11", "2026-11-07")

    expect(pace.spent).toBe(60)
    expect(pace.earned).toBe(500)
    expect(pace.previousToDate).toBe(80)
    expect(pace.change).toBe(-25)
    expect(pace.cumulative).toHaveLength(7)
    expect(pace.previousCumulative).toHaveLength(31)
    expect(pace.categories.map((c) => c.category)).toEqual(["TRANSPORT", "FOOD"])
    expect(pace.categories[0].share).toBeCloseTo(2 / 3)
  })

  it("sin gastos el mes pasado no hay porcentaje que comparar", () => {
    expect(monthPace([move("2026-11-02", 20)], [], "2026-11", "2026-11-07").change).toBeNull()
  })

  it("enero mira diciembre del año anterior; febrero tiene sus dias", () => {
    expect(previousMonthOf("2026-01")).toBe("2025-12")
    expect(daysInMonth("2028-02")).toBe(29)
  })
})

describe("goalPace", () => {
  const goal: SavingsGoal = {
    id: 1, name: "Laptop", targetAmount: 1000, accumulatedAmount: 100, progressPercent: 10,
    deadline: "2026-12-31", status: "IN_PROGRESS", completedAt: null, createdAt: "2026-01-01T00:00:00",
  }

  it("una meta con poco ahorro y casi todo el plazo usado esta atrasada", () => {
    const pace = goalPace(goal, new Date("2026-11-07T12:00:00Z"))
    expect(pace.late).toBe(true)
    expect(pace.progress).toBeCloseTo(0.1)
    expect(pace.perMonth).toBeGreaterThan(0)
  })

  it("muestra primero las metas en curso que vencen antes", () => {
    const later = { ...goal, id: 2, deadline: "2027-06-01" }
    const done = { ...goal, id: 3, status: "COMPLETED" as const, deadline: "2026-11-10" }
    expect(nearestGoals([later, done, goal]).map((g) => g.id)).toEqual([1, 2])
  })
})
