import { fireEvent, render, screen } from "@testing-library/react-native"
import { ApiError } from "@/api/errors"
import { MovementForm } from "@/components/movements/MovementForm"
import { todayIso } from "@/lib/dates"

describe("MovementForm", () => {
  it("no manda nada si falta el monto o la categoria, y lo dice", async () => {
    const onSubmit = jest.fn()
    await render(<MovementForm kind="EXPENSE" submitLabel="Guardar gasto" onSubmit={onSubmit} />)

    await fireEvent.press(screen.getByText("Guardar gasto"))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText("Ingresa el monto.")).toBeOnTheScreen()
    expect(screen.getByText("Elige una categoría.")).toBeOnTheScreen()
  })

  it("un gasto valido sale con el monto como numero y la fecha de hoy", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined)
    await render(<MovementForm kind="EXPENSE" submitLabel="Guardar gasto" onSubmit={onSubmit} />)

    await fireEvent.changeText(screen.getByLabelText("Monto (S/)"), "12,50")
    await fireEvent.press(screen.getByRole("radio", { name: "Transporte" }))
    await fireEvent.press(screen.getByText("Guardar gasto"))

    expect(onSubmit).toHaveBeenCalledWith({ category: "TRANSPORT", amount: 12.5, date: todayIso(), description: null })
  })

  it("si el backend rechaza, muestra su mensaje y deja editar", async () => {
    const onSubmit = jest.fn().mockRejectedValue(
      new ApiError({ kind: "http", status: 400, serverMessage: "El monto supera tu saldo disponible de 0.00." }),
    )
    await render(<MovementForm kind="INCOME" submitLabel="Guardar ingreso" onSubmit={onSubmit} />)

    await fireEvent.changeText(screen.getByLabelText("Monto (S/)"), "100")
    await fireEvent.changeText(screen.getByLabelText("¿De dónde vino?"), "Sueldo")
    await fireEvent.press(screen.getByText("Guardar ingreso"))

    expect(await screen.findByText("El monto supera tu saldo disponible de 0.00.")).toBeOnTheScreen()
    expect(screen.getByLabelText("Monto (S/)")).toHaveDisplayValue("100")
  })
})
