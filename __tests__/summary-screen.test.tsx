import { render, screen } from "@testing-library/react-native"
import { ApiError } from "@/api/errors"
import { financeService } from "@/services/financeService"
import { goalService } from "@/services/goalService"
import { movementService } from "@/services/movementService"
import { todayIso } from "@/lib/dates"
import SummaryScreen from "../app/(app)/(tabs)/index"

jest.mock("@/services/financeService", () => ({ financeService: { savings: jest.fn(), wallet: jest.fn() } }))
jest.mock("@/services/goalService", () => ({ goalService: { list: jest.fn() } }))
jest.mock("@/services/movementService", () => ({ movementService: { list: jest.fn(), month: jest.fn() } }))
jest.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { name: "Valeria Demo" } }) }))
jest.mock("expo-router", () => ({ router: { push: jest.fn() }, useFocusEffect: jest.fn() }))

const finance = financeService as jest.Mocked<typeof financeService>
const goalsApi = goalService as jest.Mocked<typeof goalService>
const movements = movementService as jest.Mocked<typeof movementService>
const today = todayIso()

const savings = { id: 1, currentBalance: 1540.5, committedAmount: 300, availableBalance: 1240.5, updatedAt: today }
const tottus = { id: 7, kind: "EXPENSE" as const, label: "Tottus", category: "FOOD" as const, amount: 35.9, date: today, createdAt: today }

beforeEach(() => {
  jest.resetAllMocks()
  finance.savings.mockResolvedValue(savings)
  finance.wallet.mockResolvedValue({ id: 1, tokenBalance: 120, updatedAt: today })
  goalsApi.list.mockResolvedValue([
    { id: 1, name: "Laptop", targetAmount: 1000, accumulatedAmount: 200, progressPercent: 20, deadline: "2099-05-01",
      status: "IN_PROGRESS", completedAt: null, createdAt: `${today}T00:00:00` },
  ])
  movements.list.mockResolvedValue({ content: [tottus], page: 0, size: 5, totalElements: 1, totalPages: 1 })
  movements.month.mockImplementation(async (month: string) => (today.startsWith(month) ? [tottus] : []))
})

describe("Resumen", () => {
  it("muestra el disponible sin lo apartado, las fichas aparte, el mes, las categorias, las metas y lo ultimo", async () => {
    await render(<SummaryScreen />)

    expect(await screen.findByText("S/ 1,240.50")).toBeTruthy()
    expect(screen.getByText("Sin contar S/ 300.00 apartados en 1 meta")).toBeTruthy()
    expect(await screen.findByText("120 fichas")).toBeTruthy()
    expect(await screen.findByText("Este mes")).toBeTruthy()
    expect(screen.getByText("En qué se te va")).toBeTruthy()
    expect(await screen.findByText("Laptop")).toBeTruthy()
    expect(await screen.findByText("Tottus")).toBeTruthy()
    expect(screen.queryByText("Empieza por aquí")).toBeNull()
  })

  it("una cuenta sin movimientos muestra por donde empezar, no tarjetas vacias", async () => {
    movements.list.mockResolvedValue({ content: [], page: 0, size: 5, totalElements: 0, totalPages: 0 })
    movements.month.mockResolvedValue([])
    goalsApi.list.mockResolvedValue([])

    await render(<SummaryScreen />)

    expect(await screen.findByText("Empieza por aquí")).toBeTruthy()
    expect(screen.queryByText("Este mes")).toBeNull()
  })

  it("si el saldo no carga, lo dice y ofrece reintentar sin tumbar lo demas", async () => {
    finance.savings.mockRejectedValue(new ApiError({ kind: "network" }))

    await render(<SummaryScreen />)

    expect(await screen.findByText("No pudimos conectar con el servidor. Revisa tu conexión a internet.")).toBeTruthy()
    expect(screen.getByText("Reintentar")).toBeTruthy()
    expect(await screen.findByText("Tottus")).toBeTruthy()
  })
})
