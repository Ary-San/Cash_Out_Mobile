import { fireEvent, render, screen } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { financeService } from "@/services/financeService"
import { goalService } from "@/services/goalService"
import GoalDetailScreen from "../app/(app)/goal/[id]"

jest.mock("@/services/goalService", () => ({
  goalService: { list: jest.fn(), contributions: jest.fn(), contribute: jest.fn(), remove: jest.fn(), update: jest.fn() },
}))
jest.mock("@/services/financeService", () => ({ financeService: { savings: jest.fn() } }))
jest.mock("expo-router", () => ({ router: { back: jest.fn(), navigate: jest.fn() }, useLocalSearchParams: () => ({ id: "1" }) }))

const METRICS = { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }
const renderScreen = () => render(<SafeAreaProvider initialMetrics={METRICS}><GoalDetailScreen /></SafeAreaProvider>)

const goals = goalService as jest.Mocked<typeof goalService>
const finance = financeService as jest.Mocked<typeof financeService>

const laptop = {
  id: 1, name: "Laptop", targetAmount: 1000, accumulatedAmount: 250, progressPercent: 25, deadline: "2099-06-30",
  status: "IN_PROGRESS" as const, completedAt: null, createdAt: "2026-01-01T00:00:00",
}

beforeEach(() => {
  jest.resetAllMocks()
  goals.list.mockResolvedValue([laptop])
  goals.contributions.mockResolvedValue([{ id: 1, amount: 250, source: "INCOME", createdAt: "2026-10-01T15:00:00" }])
  goals.contribute.mockResolvedValue({ id: 2, amount: 50, source: "MANUAL", createdAt: "2026-11-07T15:00:00" })
  finance.savings.mockResolvedValue({ id: 1, currentBalance: 1000, committedAmount: 250, availableBalance: 744.1, updatedAt: "" })
})

describe("Detalle de meta", () => {
  it("muestra el avance, lo que falta y el origen de cada aporte", async () => {
    await renderScreen()

    expect(await screen.findByLabelText(/^25 %, S\/\s250\.00/)).toBeTruthy()
    expect(screen.getByText("S/ 750.00")).toBeTruthy()
    expect(await screen.findByText("Desde un ingreso")).toBeTruthy()
  })

  it("aportar respeta lo que falta y el disponible, y manda el monto al backend", async () => {
    await renderScreen()

    fireEvent.press(await screen.findByText("Aportar"))
    const amount = await screen.findByLabelText("Monto (S/)")
    fireEvent.changeText(amount, "800")
    expect(await screen.findByText("Supera tu disponible de S/ 744.10.")).toBeTruthy()

    fireEvent.changeText(amount, "50")
    fireEvent.press(await screen.findByText("Aportar S/ 50.00"))

    await screen.findByText("Aportar")
    expect(goals.contribute).toHaveBeenCalledWith(1, 50)
  })
})
