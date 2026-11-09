import { fireEvent, render, screen } from "@testing-library/react-native"
import { ApiError } from "@/api/errors"
import { Segmented } from "@/components/ui/Segmented"
import { ErrorState } from "@/components/ui/States"
import { Text, Title } from "@/components/ui/Text"

const OPTIONS = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
] as const

describe("Segmented", () => {
  it("marca la opcion elegida y avisa al tocar otra", async () => {
    const onChange = jest.fn()
    await render(<Segmented label="Tema" options={OPTIONS} value="light" onChange={onChange} />)

    expect(screen.getByRole("radio", { name: "Claro" })).toBeChecked()
    expect(screen.getByRole("radio", { name: "Oscuro" })).not.toBeChecked()

    await fireEvent.press(screen.getByRole("radio", { name: "Oscuro" }))
    expect(onChange).toHaveBeenCalledWith("dark")
  })
})

describe("ErrorState", () => {
  it("ofrece reintentar ante un error de red", async () => {
    const onRetry = jest.fn()
    await render(<ErrorState error={new ApiError({ kind: "network" })} onRetry={onRetry} />)

    expect(screen.getByText(/No pudimos conectar/)).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole("button", { name: "Reintentar" }))
    expect(onRetry).toHaveBeenCalled()
  })

  it("no ofrece reintentar lo que va a fallar igual", async () => {
    await render(<ErrorState error={new ApiError({ kind: "http", status: 403 })} onRetry={jest.fn()} />)

    expect(screen.getByText(/No tienes permiso/)).toBeOnTheScreen()
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull()
  })
})

describe("Letra del sistema", () => {
  it("el texto crece con el tamano del sistema, pero con tope para no romper el layout", async () => {
    await render(<><Title>Movimientos</Title><Text>Tus gastos</Text></>)
    expect(screen.getByText("Movimientos").props.maxFontSizeMultiplier).toBe(1.3)
    expect(screen.getByText("Tus gastos").props.maxFontSizeMultiplier).toBe(1.6)
  })
})
