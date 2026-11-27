import { fireEvent, render, screen, waitFor } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import * as WebBrowser from "expo-web-browser"
import { autoRegisterService } from "@/services/autoRegisterService"
import GmailScreen from "../app/(app)/settings/gmail"

const RETURN = "exp://u.expo.dev/5930c07c-ca42-46f2-bec7-68cec6413b5f/--/settings/gmail"

jest.mock("@/services/autoRegisterService", () => ({
  autoRegisterService: { gmailStatus: jest.fn(), gmailConnectUrl: jest.fn(), confirmGmail: jest.fn(), scanGmailMonth: jest.fn(), disconnectGmail: jest.fn() },
}))
jest.mock("expo-web-browser", () => ({ openAuthSessionAsync: jest.fn() }))
jest.mock("expo-linking", () => ({
  createURL: () => "exp://u.expo.dev/5930c07c-ca42-46f2-bec7-68cec6413b5f/--/settings/gmail",
  parse: (url: string) => ({ queryParams: Object.fromEntries(new URL(url.replace("exp://", "http://")).searchParams) }),
}))
jest.mock("expo-router", () => ({ useFocusEffect: jest.fn(), useLocalSearchParams: () => ({}), router: { back: jest.fn() } }))
jest.mock("@/lib/confirm", () => ({ confirmAction: jest.fn(() => Promise.resolve(false)) }))
const mockToast = jest.fn()
jest.mock("@/components/ui/Toast", () => ({ ...jest.requireActual("@/components/ui/Toast"), useToast: () => mockToast }))

const api = autoRegisterService as jest.Mocked<typeof autoRegisterService>
const browser = WebBrowser as jest.Mocked<typeof WebBrowser>
const METRICS = { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }
const off = { available: true, connected: false, email: null, status: null, lastCheckedAt: null }
const on = { available: true, connected: true, email: "ana@gmail.com", status: "ACTIVE" as const, lastCheckedAt: null }

beforeEach(() => jest.clearAllMocks())

describe("Gmail desde la app", () => {
  it("Google vuelve a la app con el ticket y la app cierra la conexion con su sesion", async () => {
    api.gmailStatus.mockResolvedValueOnce(off).mockResolvedValue(on)
    api.gmailConnectUrl.mockResolvedValue("https://accounts.google.com/o/oauth2/v2/auth?x=1")
    api.confirmGmail.mockResolvedValue(on)
    browser.openAuthSessionAsync.mockResolvedValue({ type: "success", url: `${RETURN}?gmail=confirmar&ticket=T-1` })
    await render(<SafeAreaProvider initialMetrics={METRICS}><GmailScreen /></SafeAreaProvider>)

    await fireEvent.press(await screen.findByText("Conectar Gmail"))

    await waitFor(() => expect(api.confirmGmail).toHaveBeenCalledWith("T-1"))
    // La vuelta va a esta pantalla de la app, no a la web (donde no hay sesion).
    expect(api.gmailConnectUrl).toHaveBeenCalledWith(RETURN, undefined)
    expect(browser.openAuthSessionAsync).toHaveBeenCalledWith(expect.stringContaining("accounts.google.com"), RETURN)
  })

  it("si cancela en Google, lo dice y no confirma nada", async () => {
    api.gmailStatus.mockResolvedValue(off)
    api.gmailConnectUrl.mockResolvedValue("https://accounts.google.com/o/oauth2/v2/auth?x=1")
    browser.openAuthSessionAsync.mockResolvedValue({ type: "success", url: `${RETURN}?gmail=cancelado` })
    await render(<SafeAreaProvider initialMetrics={METRICS}><GmailScreen /></SafeAreaProvider>)

    await fireEvent.press(await screen.findByText("Conectar Gmail"))

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith("Cancelaste el permiso en Google: Gmail sigue sin conectar."))
    expect(api.confirmGmail).not.toHaveBeenCalled()
  })
})
