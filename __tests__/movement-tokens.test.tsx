import { fireEvent, render, screen, waitFor } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { ToastProvider } from "@/components/ui/Toast"
import { tokensEarnedNote } from "@/lib/market"
import { incomeService } from "@/services/incomeService"
import NewMovementScreen from "../app/(app)/movement/new"

jest.mock("@/services/incomeService", () => ({ incomeService: { create: jest.fn() } }))
jest.mock("@/services/expenseService", () => ({ expenseService: { create: jest.fn() } }))
jest.mock("expo-router", () => ({ router: { back: jest.fn() }, useLocalSearchParams: () => ({ kind: "INCOME" }) }))

const api = incomeService as jest.Mocked<typeof incomeService>
const METRICS = { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }

describe("fichas por anotar movimientos", () => {
  it("el aviso suma las fichas solo si gano alguna", () => {
    expect(tokensEarnedNote(15)).toBe(" · +15.00 fichas")
    expect(tokensEarnedNote(0)).toBe("")
    expect(tokensEarnedNote(undefined)).toBe("")
  })

  it("al guardar un ingreso, el aviso dice cuantas fichas gano", async () => {
    api.create.mockResolvedValue({ id: 1, amount: 50, source: "Propina", date: "2026-11-24", description: null, createdAt: "", tokensEarned: 15 })
    await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ToastProvider>
          <NewMovementScreen />
        </ToastProvider>
      </SafeAreaProvider>,
    )

    await fireEvent.changeText(screen.getByLabelText("Monto (S/)"), "50")
    await fireEvent.changeText(screen.getByLabelText("¿De dónde vino?"), "Propina")
    await fireEvent.press(screen.getByText("Guardar ingreso"))

    await waitFor(() => expect(api.create).toHaveBeenCalled())
    expect(await screen.findByText("Ingreso guardado · +15.00 fichas")).toBeTruthy()
  })
})
