import { fireEvent, render, screen } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { movementService } from "@/services/movementService"
import MovementsScreen from "../app/(app)/(tabs)/movements"

jest.mock("@/services/movementService", () => ({ movementService: { list: jest.fn() } }))
jest.mock("@/services/expenseService", () => ({ expenseService: { list: jest.fn() } }))
jest.mock("@/services/incomeService", () => ({ incomeService: { list: jest.fn() } }))
jest.mock("@/components/assistant/PhraseComposer", () => ({ PhraseComposer: () => null }))
jest.mock("expo-router", () => ({ router: { push: jest.fn() }, useFocusEffect: jest.fn() }))

const api = movementService as jest.Mocked<typeof movementService>
const METRICS = { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }
const row = (id: number) => ({ id, kind: "EXPENSE" as const, label: `Gasto ${id}`, category: "FOOD" as const, amount: id, date: "2026-11-01", createdAt: "2026-11-01" })

beforeEach(() => jest.clearAllMocks())

describe("Movimientos", () => {
  it("muestra la lista y Ver mas pide la siguiente tanda", async () => {
    api.list.mockResolvedValue({ content: [row(1), row(2)], page: 0, size: 20, totalElements: 25, totalPages: 2 })
    await render(<SafeAreaProvider initialMetrics={METRICS}><MovementsScreen /></SafeAreaProvider>)

    expect(await screen.findByText("Gasto 1")).toBeTruthy()
    expect(screen.getByText("Gasto 2")).toBeTruthy()
    await fireEvent.press(screen.getByText("Ver más"))
    expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ size: 40 }), expect.anything())
  })

  it("sin movimientos muestra el estado vacio y no el boton Ver mas", async () => {
    api.list.mockResolvedValue({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })
    await render(<SafeAreaProvider initialMetrics={METRICS}><MovementsScreen /></SafeAreaProvider>)

    expect(await screen.findByText("Todavía no hay movimientos")).toBeTruthy()
    expect(screen.queryByText("Ver más")).toBeNull()
  })
})
