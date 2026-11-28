import { fireEvent, render, screen, waitFor } from "@testing-library/react-native"
import { Linking } from "react-native"
import { router } from "expo-router"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { balanceText, previewMyShare } from "@/lib/splits"
import { splitService } from "@/services/splitService"
import type { SplitBill } from "@/types/splits"
import SplitBillsScreen from "../app/(app)/split-bills"
import NewSplitScreen from "../app/(app)/split-new"

jest.mock("@/services/splitService", () => ({
  splitService: { list: jest.fn(), balances: jest.fn(), hint: jest.fn(), create: jest.fn(), setPaid: jest.fn(), setSettled: jest.fn(), remove: jest.fn() },
}))
const mockParams: { current: Record<string, string> } = { current: {} }
jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockParams.current,
}))
const mockToast = jest.fn()
jest.mock("@/components/ui/Toast", () => ({ ...jest.requireActual("@/components/ui/Toast"), useToast: () => mockToast }))

const api = splitService as jest.Mocked<typeof splitService>
const METRICS = { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }
const wrap = (node: React.ReactNode) => <SafeAreaProvider initialMetrics={METRICS}>{node}</SafeAreaProvider>

const dinner: SplitBill = {
  id: 1, title: "Cena del sábado", category: "FOOD", categoryName: "Comida", total: 90, myShare: 30, paidByMe: true,
  date: "2026-11-21", expenseId: 5, settled: false, pending: 60,
  parts: [
    { id: 11, name: "Luis", phone: "51987654321", share: 30, payer: false, status: "PENDING", paidAt: null, reminderUrl: "https://wa.me/51987654321?text=Hola" },
    { id: 12, name: "Pedro", phone: null, share: 30, payer: false, status: "PAID", paidAt: "2026-11-22T10:00:00", reminderUrl: null },
  ],
}

beforeEach(() => {
  jest.clearAllMocks()
  mockParams.current = {}
})

describe("Ola 3 (app)", () => {
  it("las reglas de los saldos y de mi parte", () => {
    expect(balanceText({ name: "A", phone: null, owesMe: 30, iOwe: 30, net: 0, bills: 2, reminderUrl: null })).toMatch(/Están a mano/)
    expect(balanceText({ name: "A", phone: null, owesMe: 0, iOwe: 20, net: -20, bills: 1, reminderUrl: null })).toMatch(/Le debes S\/\s?20\.00/)
    expect(previewMyShare(100, "EQUAL", true, [0, 0])).toBe(33.34)
  })

  it("muestra las cuentas, marca 'Me pagó' y abre el recordatorio de WhatsApp", async () => {
    api.list.mockResolvedValue([dinner])
    api.balances.mockResolvedValue([{ name: "Luis", phone: "51987654321", owesMe: 30, iOwe: 0, net: 30, bills: 1, reminderUrl: "https://wa.me/x" }])
    api.setPaid.mockResolvedValue(dinner)
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(true)
    await render(wrap(<SplitBillsScreen />))

    expect(await screen.findByText(/Te debe S\/\s?30\.00/)).toBeTruthy()
    expect(screen.getByText("Pagó")).toBeTruthy()
    await fireEvent.press(screen.getByText("Recordar por WhatsApp"))
    expect(open).toHaveBeenCalledWith("https://wa.me/51987654321?text=Hola")
    await fireEvent.press(screen.getByText("Me pagó"))
    await waitFor(() => expect(api.setPaid).toHaveBeenCalledWith(1, 11, true))
    expect(mockToast).toHaveBeenCalledWith("Anotamos el reembolso de Luis")
  })

  it("dividir un gasto con los nombres de la frase manda las partes", async () => {
    mockParams.current = { expenseId: "5", amount: "90", description: "Cena", category: "FOOD", names: "Luis|Pedro" }
    api.create.mockResolvedValue(dinner)
    await render(wrap(<NewSplitScreen />))

    expect(screen.getByDisplayValue("Luis")).toBeTruthy()
    expect(screen.getByText(/Tu parte: S\/\s?30\.00\. Te deben S\/\s?60\.00\./)).toBeTruthy()
    await fireEvent.changeText(screen.getByLabelText("WhatsApp de Luis (opcional)"), "987654321")
    await fireEvent.press(screen.getByText("Guardar cuenta"))

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/split-bills"))
    expect(api.create).toHaveBeenCalledWith(expect.objectContaining({
      expenseId: 5,
      paidByMe: true,
      mode: "EQUAL",
      people: [{ name: "Luis", phone: "987654321", amount: undefined, percent: undefined }, { name: "Pedro", phone: undefined, amount: undefined, percent: undefined }],
    }))
  })
})
