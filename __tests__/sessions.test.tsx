import { fireEvent, render, screen, waitFor } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { lastActive } from "@/lib/sessions"
import { sessionService } from "@/services/sessionService"
import type { SessionInfo } from "@/types/sessions"
import SessionsScreen from "../app/(app)/settings/sessions"

jest.mock("@/services/sessionService", () => ({ sessionService: { list: jest.fn(), close: jest.fn(), closeOthers: jest.fn(), connections: jest.fn(), closeConnection: jest.fn() } }))
jest.mock("expo-router", () => ({ router: { back: jest.fn(), push: jest.fn() } }))
jest.mock("@/lib/confirm", () => ({ confirmAction: jest.fn(() => Promise.resolve(true)) }))
const mockToast = jest.fn()
jest.mock("@/components/ui/Toast", () => ({ ...jest.requireActual("@/components/ui/Toast"), useToast: () => mockToast }))

const api = sessionService as jest.Mocked<typeof sessionService>
const METRICS = { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }
const mine: SessionInfo = { id: "s1", device: "App Cash-Out en Android (Pixel 7)", location: "Miraflores, Lima", ip: "190.235.•.•", startedAt: "2026-11-20T10:00:00-05:00", lastUsedAt: new Date().toISOString(), current: true }
const stranger: SessionInfo = { id: "s2", device: "Chrome en Windows", location: "San Juan de Lurigancho, Lima", ip: "181.65.•.•", startedAt: "2026-11-27T09:00:00-05:00", lastUsedAt: new Date(Date.now() - 3 * 3600_000).toISOString(), current: false }

beforeEach(() => {
  jest.clearAllMocks()
  api.connections.mockResolvedValue([])
})

describe("Sesiones activas (app)", () => {
  it("dice hace cuánto se usó", () => {
    const now = Date.parse("2026-11-27T20:00:00Z")
    expect(lastActive("2026-11-27T19:55:00Z", now)).toBe("hace 5 min")
    expect(lastActive("2026-11-25T20:00:00Z", now)).toBe("hace 2 días")
  })

  it("muestra la actual y la ajena con su distrito, y cierra la ajena", async () => {
    api.list.mockResolvedValueOnce([mine, stranger]).mockResolvedValue([mine])
    api.close.mockResolvedValue()
    await render(<SafeAreaProvider initialMetrics={METRICS}><SessionsScreen /></SafeAreaProvider>)

    expect(await screen.findByText("Este dispositivo")).toBeTruthy()
    expect(screen.getByText("San Juan de Lurigancho, Lima")).toBeTruthy()
    expect(screen.getByText(/IP 181\.65\.•\.• · Activa hace 3 h/)).toBeTruthy()
    expect(screen.getByLabelText("Chrome en Windows, San Juan de Lurigancho, Lima, activa hace 3 h")).toBeTruthy()

    await fireEvent.press(screen.getByText("Cerrar"))
    await waitFor(() => expect(api.close).toHaveBeenCalledWith("s2"))
    expect(mockToast).toHaveBeenCalledWith("Sesión cerrada: ese dispositivo ya no puede entrar.")
  })

  it("cerrar todas las demás", async () => {
    api.list.mockResolvedValue([mine, stranger])
    api.connections.mockResolvedValue([{ kind: "WHATSAPP", label: "WhatsApp", detail: "+51 9•• ••• 777", since: null, lastUsedAt: null }])
    api.closeOthers.mockResolvedValue({ closed: 1, connections: 1 })
    await render(<SafeAreaProvider initialMetrics={METRICS}><SessionsScreen /></SafeAreaProvider>)

    await fireEvent.press(await screen.findByText("Cerrar todas las demás"))
    await waitFor(() => expect(api.closeOthers).toHaveBeenCalled())
    expect(mockToast).toHaveBeenCalledWith("Cerramos 1 sesión y desconectamos tu WhatsApp y el atajo.")
  })
})

describe("Conexiones (app)", () => {
  it("lista WhatsApp y el atajo junto a las sesiones, y quita uno", async () => {
    api.list.mockResolvedValue([mine])
    api.connections.mockResolvedValueOnce([
      { kind: "WHATSAPP", label: "WhatsApp", detail: "+51 9•• ••• 777", since: null, lastUsedAt: new Date(Date.now() - 2 * 3600_000).toISOString() },
      { kind: "SHORTCUT", label: "Atajo de iPhone", detail: "Anota tus pagos con Apple Pay", since: null, lastUsedAt: null },
    ]).mockResolvedValue([])
    api.closeConnection.mockResolvedValue()
    await render(<SafeAreaProvider initialMetrics={METRICS}><SessionsScreen /></SafeAreaProvider>)

    expect(await screen.findByText("+51 9•• ••• 777")).toBeTruthy()
    expect(screen.getByText("Usado hace 2 h")).toBeTruthy()
    expect(screen.getByText("Sin uso todavía")).toBeTruthy()
    await fireEvent.press(screen.getAllByText("Quitar")[0])
    await waitFor(() => expect(api.closeConnection).toHaveBeenCalledWith("WHATSAPP"))
  })
})

