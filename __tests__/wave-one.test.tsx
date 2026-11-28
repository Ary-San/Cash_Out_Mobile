import { fireEvent, render, screen, waitFor } from "@testing-library/react-native"
import { router } from "expo-router"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { BudgetsCard } from "@/components/summary/BudgetsCard"
import { reportHtml } from "@/lib/monthExport"
import { appRoute } from "@/lib/notifications"
import { budgetService } from "@/services/budgetService"
import { notificationService } from "@/services/notificationService"
import type { Budget } from "@/types/budgets"
import type { AppNotification } from "@/types/notifications"
import BudgetsScreen from "../app/(app)/budgets"
import NotificationsScreen from "../app/(app)/notifications"

jest.mock("@/services/budgetService", () => ({ budgetService: { list: jest.fn(), set: jest.fn(), remove: jest.fn() } }))
jest.mock("@/services/notificationService", () => ({ notificationService: { list: jest.fn(), unread: jest.fn(), markRead: jest.fn(), markAllRead: jest.fn() } }))
jest.mock("expo-router", () => ({ router: { back: jest.fn(), push: jest.fn() } }))
jest.mock("expo-print", () => ({ printToFileAsync: jest.fn(), printAsync: jest.fn() }))
jest.mock("expo-sharing", () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }))
jest.mock("expo-file-system", () => ({ File: jest.fn(), Paths: {} }))
const mockToast = jest.fn()
jest.mock("@/components/ui/Toast", () => ({ ...jest.requireActual("@/components/ui/Toast"), useToast: () => mockToast }))

const budgets = budgetService as jest.Mocked<typeof budgetService>
const inbox = notificationService as jest.Mocked<typeof notificationService>
const METRICS = { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }
const wrap = (node: React.ReactNode) => <SafeAreaProvider initialMetrics={METRICS}>{node}</SafeAreaProvider>

const food: Budget = { category: "FOOD", name: "Comida", limit: 300, spent: 255, remaining: 45, share: 0.85 }
const leisure: Budget = { category: "LEISURE", name: "Ocio", limit: 100, spent: 130, remaining: 0, share: 1.3 }

beforeEach(() => jest.clearAllMocks())

describe("Ola 1 (app)", () => {
  it("traduce el enlace de cada aviso a su pantalla", () => {
    expect(appRoute("/resumen")).toBe("/")
    expect(appRoute("/metas")).toBe("/goals")
    expect(appRoute("/perfil#perfil-sesiones")).toBe("/settings/sessions")
    expect(appRoute("/algo-raro")).toBeNull()
    expect(appRoute(null)).toBeNull()
  })

  it("el PDF no interpreta como HTML lo que escribió el usuario", () => {
    const html = reportHtml({
      month: "2026-11", income: 2000, expense: 40, net: 1960,
      categories: [{ category: "FOOD", name: "Comida", spent: 40, limit: null }],
      movements: [{ id: 1, kind: "EXPENSE", label: "<img src=x onerror=alert(1)>", category: "FOOD", amount: 40, date: "2026-11-03" }],
    })
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;")
    expect(html).not.toContain("<img")
    expect(html).toContain("Noviembre de 2026")
    expect(html).toContain("Ahorraste")
  })

  it("la tarjeta muestra cuánto queda y cuándo uno se pasó", async () => {
    await render(<BudgetsCard budgets={[food, leisure]} onEdit={jest.fn()} />)
    expect(screen.getByLabelText(/Comida: S\/\s?255\.00 de S\/\s?300\.00, 85 %/)).toBeTruthy()
    expect(screen.getByText(/Te quedan S\/\s?45\.00 · 85 %/)).toBeTruthy()
    expect(screen.getByText(/Te pasaste por S\/\s?30\.00/)).toBeTruthy()
  })

  it("editar presupuestos guarda solo lo que cambió y quita lo vacío", async () => {
    budgets.list.mockResolvedValue([food, leisure])
    budgets.set.mockResolvedValue(food)
    budgets.remove.mockResolvedValue()
    await render(wrap(<BudgetsScreen />))
    await fireEvent.changeText(await screen.findByLabelText("Transporte (S/)"), "80,50")
    await fireEvent.changeText(screen.getByLabelText("Ocio (S/)"), "")
    await fireEvent.press(screen.getByText("Guardar"))

    await waitFor(() => expect(router.back).toHaveBeenCalled())
    expect(budgets.set).toHaveBeenCalledTimes(1)
    expect(budgets.set).toHaveBeenCalledWith("TRANSPORT", 80.5)
    expect(budgets.remove).toHaveBeenCalledWith("LEISURE")
  })

  it("tocar un aviso lo marca como leído y lleva a su pantalla", async () => {
    const alert: AppNotification = { id: 7, type: "SECURITY", title: "Nuevo inicio de sesión", body: "Chrome en Windows, cerca de Surco, Lima.", link: "/perfil#perfil-sesiones", read: false, createdAt: new Date().toISOString() }
    inbox.list.mockResolvedValue({ content: [alert] } as never)
    inbox.markRead.mockResolvedValue()
    await render(wrap(<NotificationsScreen />))
    await fireEvent.press(await screen.findByLabelText(/^Sin leer\. Nuevo inicio de sesión/))
    expect(inbox.markRead).toHaveBeenCalledWith(7)
    expect(router.push).toHaveBeenCalledWith("/settings/sessions")
    expect(screen.queryByText("Marcar todo como leído")).toBeNull()
  })
})
