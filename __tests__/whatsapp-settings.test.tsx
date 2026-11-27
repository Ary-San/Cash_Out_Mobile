import { Linking } from "react-native"
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { ToastProvider } from "@/components/ui/Toast"
import { formatCountdown, formatPhone, secondsLeft, waLink } from "@/lib/whatsapp"
import { whatsappService } from "@/services/whatsappService"
import WhatsAppScreen from "../app/(app)/settings/whatsapp"

jest.mock("@/services/whatsappService", () => ({ whatsappService: { status: jest.fn(), link: jest.fn(), unlink: jest.fn() } }))
jest.mock("expo-router", () => ({ router: { back: jest.fn() }, useFocusEffect: jest.fn() }))
jest.mock("@/lib/confirm", () => ({ confirmAction: jest.fn(async () => true) }))

const api = whatsappService as jest.Mocked<typeof whatsappService>
const METRICS = { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }
const base = { linked: false, phone: null, code: null, codeExpiresAt: null, number: "+14155238886", joinText: "join verde-mar" }
const wrap = () => (
  <SafeAreaProvider initialMetrics={METRICS}>
    <ToastProvider>
      <WhatsAppScreen />
    </ToastProvider>
  </SafeAreaProvider>
)

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(Linking, "openURL").mockResolvedValue(undefined)
})

describe("WhatsApp: reglas", () => {
  it("arma el link de WhatsApp con el mensaje y muestra el numero legible", () => {
    expect(waLink("+14155238886", "join verde-mar")).toBe("https://wa.me/14155238886?text=join%20verde-mar")
    expect(formatPhone("+14155238886")).toBe("+1 415 523 8886")
  })

  it("la cuenta regresiva lee la hora de Lima que manda el backend", () => {
    const now = Date.parse("2026-11-26T15:00:00Z")
    expect(secondsLeft("2026-11-26T10:05:00", now)).toBe(300)
    expect(secondsLeft("2026-11-26T09:59:00", now)).toBe(0)
    expect(formatCountdown(125)).toBe("2:05")
  })
})

describe("WhatsApp: pantalla", () => {
  it("sin vincular: unirse al sandbox y pedir el codigo, que se manda por WhatsApp", async () => {
    api.status.mockResolvedValue(base)
    const expires = new Date(Date.now() + 10 * 60_000)
    const lima = new Date(expires.getTime() - 5 * 3600_000).toISOString().slice(0, 19)
    api.link.mockResolvedValue({ ...base, code: "CO-123456", codeExpiresAt: lima })
    await render(wrap())

    await fireEvent.press(await screen.findByText("Mandar el mensaje"))
    expect(Linking.openURL).toHaveBeenCalledWith("https://wa.me/14155238886?text=join%20verde-mar")

    await fireEvent.press(screen.getByText("Vincular"))
    expect(await screen.findByText("CO-123456")).toBeTruthy()
    await fireEvent.press(screen.getByText("Mandar el código por WhatsApp"))
    expect(Linking.openURL).toHaveBeenLastCalledWith("https://wa.me/14155238886?text=CO-123456")
  })

  it("vinculado: muestra el numero enmascarado y se puede desvincular", async () => {
    api.status.mockResolvedValue({ ...base, linked: true, phone: "+51 9•• ••• 777" })
    await render(wrap())

    expect(await screen.findByText("+51 9•• ••• 777")).toBeTruthy()
    await fireEvent.press(screen.getByText("Desvincular"))
    await waitFor(() => expect(api.unlink).toHaveBeenCalled())
  })
})
