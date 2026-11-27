import { fireEvent, render, screen, waitFor } from "@testing-library/react-native"
import { Linking } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { ApiError } from "@/api/errors"
import { TwoFactorStep } from "@/components/auth/TwoFactorStep"
import { twoFactorService } from "@/services/twoFactorService"
import TwoFactorScreen from "../app/(app)/settings/two-factor"

jest.mock("@/services/twoFactorService", () => ({
  twoFactorService: { status: jest.fn(), setup: jest.fn(), enable: jest.fn(), disable: jest.fn(), regenerate: jest.fn() },
}))
jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }))
jest.mock("expo-router", () => ({ router: { back: jest.fn(), push: jest.fn() } }))
const mockToast = jest.fn()
jest.mock("@/components/ui/Toast", () => ({ ...jest.requireActual("@/components/ui/Toast"), useToast: () => mockToast }))
const mockAuth = {
  user: { id: 1, name: "Ana", email: "ana@utec.edu.pe", roles: ["USER"], twoFactorEnabled: false },
  updateUser: jest.fn(),
  completeTwoFactor: jest.fn(),
  cancelTwoFactor: jest.fn(),
}
jest.mock("@/hooks/useAuth", () => ({ useAuth: () => mockAuth }))

const api = twoFactorService as jest.Mocked<typeof twoFactorService>
const METRICS = { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }
const wrap = (node: React.ReactElement) => render(<SafeAreaProvider initialMetrics={METRICS}>{node}</SafeAreaProvider>)
const CODES = ["AAAAA-BBBBB", "CCCCC-DDDDD", "EEEEE-FFFFF", "GGGGG-HHHHH", "JJJJJ-KKKKK", "MMMMM-NNNNN", "PPPPP-QQQQQ", "RRRRR-SSSSS", "TTTTT-UUUUU", "VVVVV-WWWWW"]

beforeEach(() => jest.clearAllMocks())

describe("Verificación en dos pasos (app)", () => {
  it("activar: contraseña, enlace a la app autenticadora o clave a mano, primer código y los códigos de recuperación", async () => {
    api.status.mockResolvedValue({ available: true, enabled: false, pending: false, recoveryCodesLeft: 0 })
    api.setup.mockResolvedValue({ secret: "JBSW Y3DP EHPK 3PXP", otpauthUri: "otpauth://totp/Cash-Out:ana?secret=JBSWY3DPEHPK3PXP" })
    api.enable.mockResolvedValue(CODES)
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue()
    await wrap(<TwoFactorScreen />)

    await fireEvent.press(await screen.findByText("Activar"))
    await fireEvent.changeText(screen.getByLabelText("Tu contraseña"), "Secreto123!")
    await fireEvent.press(screen.getByText("Continuar"))

    expect(await screen.findByText("JBSW Y3DP EHPK 3PXP")).toBeTruthy()
    expect(api.setup).toHaveBeenCalledWith("Secreto123!")
    await fireEvent.press(screen.getByText("Abrir en mi app autenticadora"))
    expect(open).toHaveBeenCalledWith("otpauth://totp/Cash-Out:ana?secret=JBSWY3DPEHPK3PXP")

    await fireEvent.changeText(screen.getByLabelText("Código de 6 dígitos"), "123456")
    await fireEvent.press(screen.getByText("Activar"))

    expect(await screen.findByText("Listo: guarda tus códigos de recuperación")).toBeTruthy()
    expect(api.enable).toHaveBeenCalledWith("123456")
    expect(screen.getByLabelText(/Códigos de recuperación: AAAAA-BBBBB, CCCCC-DDDDD/)).toBeTruthy()
    await fireEvent.press(screen.getByText("Ya los guardé"))
    expect(mockToast).toHaveBeenCalledWith("Verificación en dos pasos activa: cerramos tus otras sesiones.")
  })

  it("desactivar pide contraseña y código; un código equivocado lo dice", async () => {
    api.status.mockResolvedValue({ available: true, enabled: true, pending: false, recoveryCodesLeft: 7 })
    api.disable.mockRejectedValueOnce(new ApiError({ kind: "http", status: 401, serverMessage: "El código no es correcto o ya se usó." })).mockResolvedValueOnce()
    await wrap(<TwoFactorScreen />)

    expect(await screen.findByText(/Te quedan 7 códigos de recuperación/)).toBeTruthy()
    await fireEvent.press(screen.getByText("Desactivar"))
    await fireEvent.changeText(screen.getByLabelText("Tu contraseña"), "Secreto123!")
    await fireEvent.changeText(screen.getByLabelText("Código de tu app (o uno de recuperación)"), "000000")
    await fireEvent.press(screen.getByText("Desactivar"))
    expect(await screen.findByText("El código no es correcto o ya se usó.")).toBeTruthy()

    await fireEvent.changeText(screen.getByLabelText("Código de tu app (o uno de recuperación)"), "654321")
    await fireEvent.press(screen.getByText("Desactivar"))
    await waitFor(() => expect(api.disable).toHaveBeenLastCalledWith({ password: "Secreto123!", code: "654321" }))
    expect(mockAuth.updateUser).toHaveBeenCalledWith(expect.objectContaining({ twoFactorEnabled: false }))
  })

  it("al entrar pide el código y deja volver al primer paso", async () => {
    mockAuth.completeTwoFactor.mockRejectedValueOnce(new ApiError({ kind: "http", status: 401, serverMessage: "El código no es correcto o ya se usó." }))
    await wrap(<TwoFactorStep />)

    await fireEvent.press(screen.getByText("Verificar y entrar"))
    expect(screen.getByText("Escribe el código de tu app autenticadora.")).toBeTruthy()
    await fireEvent.changeText(screen.getByLabelText("Código"), "111111")
    await fireEvent.press(screen.getByText("Verificar y entrar"))
    expect(await screen.findByText("El código no es correcto o ya se usó.")).toBeTruthy()
    expect(mockAuth.completeTwoFactor).toHaveBeenCalledWith("111111")

    await fireEvent.press(screen.getByText("Volver a iniciar sesión"))
    expect(mockAuth.cancelTwoFactor).toHaveBeenCalled()
  })
})
