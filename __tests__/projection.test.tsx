import { fireEvent, render, screen, waitFor } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { goalReach, parseProjection, projectionCurve, sameParams } from "@/lib/projections"
import { goalService } from "@/services/goalService"
import { projectionService } from "@/services/projectionService"
import ProjectionScreen from "../app/(app)/projection"

jest.mock("@/services/projectionService", () => ({ projectionService: { list: jest.fn(), preview: jest.fn(), create: jest.fn(), remove: jest.fn() } }))
jest.mock("@/services/goalService", () => ({ goalService: { list: jest.fn() } }))
let mockParams: { goalId?: string } = {}
jest.mock("expo-router", () => ({ router: { back: jest.fn(), push: jest.fn() }, useLocalSearchParams: () => mockParams }))

const api = projectionService as jest.Mocked<typeof projectionService>
const METRICS = { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }
const OUTCOME = { totalContributed: 3380, simpleFinalAmount: 3530.12, compoundFinalAmount: 3541.6, difference: 11.48 }

beforeEach(() => {
  jest.clearAllMocks()
  mockParams = {}
  api.list.mockResolvedValue([])
  api.preview.mockResolvedValue(OUTCOME)
  api.create.mockResolvedValue({ id: 1, name: "Depósito", savingsGoalId: null, calculatedAt: "2026-11-16T10:00:00", initialCapital: 500, monthlyContribution: 120, annualRate: 0.05, periods: 24, ...OUTCOME })
})

describe("proyecciones: calculo", () => {
  it("valida como la web: la TEA en porcentaje y el plazo de 1 a 600 meses", () => {
    expect(parseProjection({ initialCapital: "500", monthlyContribution: "0", annualRatePercent: "7,5", periods: "24" }).params).toEqual({
      initialCapital: 500,
      monthlyContribution: 0,
      annualRate: 0.075,
      periods: 24,
    })
    expect(parseProjection({ initialCapital: "500", monthlyContribution: "120", annualRatePercent: "5", periods: "700" }).errors?.periods).toBe(
      "El plazo va de 1 a 600 meses (50 años).",
    )
  })

  it("la curva compuesta crece sobre la simple y sobre lo aportado", () => {
    const curve = projectionCurve({ initialCapital: 1000, monthlyContribution: 100, annualRate: 0.08, periods: 24 })
    expect(curve.compound).toHaveLength(25)
    expect(curve.compound[24]).toBeGreaterThan(curve.simple[24])
    expect(curve.simple[24]).toBeGreaterThan(curve.contributed[24])
  })

  it("dice cuando se llega a una meta y cuanto aportar para llegar a tiempo", () => {
    const reach = goalReach({ initialCapital: 0, monthlyContribution: 100, annualRate: 0, periods: 12 }, 1200, 6)
    expect(reach).toEqual({ reachMonth: 12, needed: 200 })
    expect(sameParams({ initialCapital: 500, monthlyContribution: 120, annualRate: 0.05, periods: 24 }, { initialCapital: 500.001, monthlyContribution: 120, annualRate: 0.05, periods: 24 })).toBe(true)
  })
})

describe("proyecciones: pantalla", () => {
  it("muestra el resultado del backend y guarda el escenario con un nombre", async () => {
    await render(<SafeAreaProvider initialMetrics={METRICS}><ProjectionScreen /></SafeAreaProvider>)

    expect(await screen.findByText("S/ 3,541.60")).toBeTruthy()
    await fireEvent.press(screen.getByText("Depósito a plazo · 5 %"))
    await fireEvent.press(screen.getByText("Guardar escenario"))
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Depósito")
    await fireEvent.press(screen.getByText("Guardar"))

    await waitFor(() => expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ name: "Depósito", annualRate: 0.05, savingsGoalId: null })))
  })
})

describe("proyecciones: desde una meta", () => {
  it("se llena con la meta y dice cuanto aportar para llegar a tiempo", async () => {
    mockParams = { goalId: "7" }
    const deadline = new Date(Date.now() + 9 * 30.44 * 86_400_000).toISOString().slice(0, 10)
    ;(goalService.list as jest.Mock).mockResolvedValue([
      { id: 7, name: "Laptop", targetAmount: 2000, accumulatedAmount: 650, progressPercent: 32.5, deadline, status: "IN_PROGRESS", completedAt: null, createdAt: "2026-10-01T00:00:00" },
    ])
    await render(<SafeAreaProvider initialMetrics={METRICS}><ProjectionScreen /></SafeAreaProvider>)

    expect(await screen.findByText("Tu meta Laptop · S/ 2,000.00")).toBeTruthy()
    expect(screen.getByLabelText("Capital inicial (S/)").props.value).toBe("650.00")
  })
})
