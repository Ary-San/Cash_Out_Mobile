import { act, fireEvent, render, renderHook, screen } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import * as LocalAuthentication from "expo-local-authentication"
import * as SecureStore from "expo-secure-store"
import { LockScreen } from "@/components/auth/LockScreen"
import { useAppLock } from "@/hooks/useAppLock"
import { biometricSupport, confirmWithBiometrics } from "@/lib/biometrics"

const mockLogout = jest.fn()
jest.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { name: "Valeria Quispe" }, logout: mockLogout }) }))

const auth = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>
const METRICS = { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }

beforeEach(() => {
  jest.clearAllMocks()
  auth.hasHardwareAsync.mockResolvedValue(true)
  auth.isEnrolledAsync.mockResolvedValue(true)
  auth.authenticateAsync.mockResolvedValue({ success: true })
  SecureStore.setItem("cashout.biometrics", "off")
})

describe("biometria", () => {
  it("sin huella registrada no se puede activar y lo explica", async () => {
    auth.isEnrolledAsync.mockResolvedValue(false)
    expect(await biometricSupport()).toEqual({ available: false, label: "huella", reason: "Primero registra tu huella en los ajustes del celular." })
  })

  it("las acciones delicadas solo piden la huella si esta activa", async () => {
    expect(await confirmWithBiometrics("Confirma la compra")).toBe(true)
    expect(auth.authenticateAsync).not.toHaveBeenCalled()

    SecureStore.setItem("cashout.biometrics", "on")
    auth.authenticateAsync.mockResolvedValue({ success: false, error: "user_cancel" })
    expect(await confirmWithBiometrics("Confirma la compra")).toBe(false)
  })

  it("al restaurar la sesion se bloquea si esta activa; recien despues de escribir la contraseña no", async () => {
    type Status = "restoring" | "authenticated" | "anonymous"
    SecureStore.setItem("cashout.biometrics", "on")
    const restored = await renderHook(({ status }: { status: Status }) => useAppLock(status), { initialProps: { status: "restoring" as Status } })
    await restored.rerender({ status: "authenticated" })
    expect(restored.result.current.locked).toBe(true)
    await act(async () => restored.result.current.unlock())
    expect(restored.result.current.locked).toBe(false)

    const typed = await renderHook(({ status }: { status: Status }) => useAppLock(status), { initialProps: { status: "anonymous" as Status } })
    await typed.rerender({ status: "authenticated" })
    expect(typed.result.current.locked).toBe(false)
  })

  it("la pantalla de bloqueo pide la huella sola y, si falla, deja entrar con la contraseña", async () => {
    auth.authenticateAsync.mockResolvedValue({ success: false, error: "user_cancel" })
    const onUnlock = jest.fn()
    await render(<SafeAreaProvider initialMetrics={METRICS}><LockScreen onUnlock={onUnlock} /></SafeAreaProvider>)

    expect(await screen.findByText("No pudimos confirmar que eres tú. Inténtalo de nuevo o entra con tu contraseña.")).toBeTruthy()
    expect(auth.authenticateAsync).toHaveBeenCalledTimes(1)
    expect(onUnlock).not.toHaveBeenCalled()

    await fireEvent.press(screen.getByText("Entrar con mi contraseña"))
    expect(mockLogout).toHaveBeenCalled()
  })
})
