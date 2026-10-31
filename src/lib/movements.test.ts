import { expenseToMovement, incomeToMovement, movementKey } from "@/lib/movements"

describe("movements", () => {
  it("un gasto usa su descripcion como titulo y un ingreso, su origen", () => {
    const expense = expenseToMovement({ id: 7, category: "FOOD", amount: 35, date: "2026-10-27", description: "Chifa", createdAt: "x" })
    const income = incomeToMovement({ id: 7, amount: 1500, source: "Sueldo", date: "2026-10-28", description: null, createdAt: "x" })

    expect(expense).toMatchObject({ kind: "EXPENSE", label: "Chifa", category: "FOOD" })
    expect(income).toMatchObject({ kind: "INCOME", label: "Sueldo", category: null })
  })

  it("un gasto y un ingreso con el mismo id no chocan en la lista", () => {
    const expense = expenseToMovement({ id: 7, category: "FOOD", amount: 1, date: "2026-10-27", description: null, createdAt: "x" })
    const income = incomeToMovement({ id: 7, amount: 1, source: "x", date: "2026-10-27", description: null, createdAt: "x" })

    expect(movementKey(expense)).not.toBe(movementKey(income))
  })
})
