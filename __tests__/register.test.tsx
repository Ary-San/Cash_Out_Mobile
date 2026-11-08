import { fireEvent, render, screen } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { ApiError } from "@/api/errors"
import type { RegisterResult } from "@/types/auth"
import RegisterScreen from "../app/(auth)/register"

jest.mock("expo-router", () => ({ router: { replace: jest.fn(), push: jest.fn() } }))
jest.mock("@/services/authService", () => ({ authService: { resendVerification: jest.fn().mockResolvedValue(undefined) } }))

const mockRegister = jest.fn<Promise<RegisterResult>, [unknown]>()
jest.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ register: mockRegister }) }))

const METRICS = { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }
const user = { id: 9, name: "Ana", email: "ana@cashout.test", roles: ["USER" as const], status: "ACTIVE" as const, birthDate: null, createdAt: "2026-11-08T10:00:00" }

const fill = async (accept = true) => {
  await fireEvent.changeText(screen.getByLabelText("Nombre"), "Ana")
  await fireEvent.changeText(screen.getByLabelText("Correo"), "ana@cashout.test")
  await fireEvent.changeText(screen.getByLabelText("Contraseña"), "Nueva2026!")
  if (accept) await fireEvent.press(screen.getByRole("checkbox"))
  await fireEvent.press(screen.getByText("Crear cuenta"))
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("Registro", () => {
  it("pide aceptar que es un proyecto academico antes de crear la cuenta", async () => {
    await render(<SafeAreaProvider initialMetrics={METRICS}><RegisterScreen /></SafeAreaProvider>)
    await fill(false)
    expect(await screen.findByText("Marca la casilla para continuar.")).toBeTruthy()
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it("manda los datos sin la fecha si se dejo vacia", async () => {
    mockRegister.mockResolvedValue({ user, verificationRequired: false })
    await render(<SafeAreaProvider initialMetrics={METRICS}><RegisterScreen /></SafeAreaProvider>)
    await fill()
    await screen.findByText("Crear cuenta")
    expect(mockRegister).toHaveBeenCalledWith({ name: "Ana", email: "ana@cashout.test", password: "Nueva2026!", birthDate: undefined })
  })

  it("si el backend pide confirmar el correo, lo dice y deja reenviar el enlace", async () => {
    mockRegister.mockResolvedValue({ user, verificationRequired: true })
    await render(<SafeAreaProvider initialMetrics={METRICS}><RegisterScreen /></SafeAreaProvider>)
    await fill()
    expect(await screen.findByText("Tu cuenta está creada")).toBeTruthy()
    expect(screen.getByText("Ir a iniciar sesión")).toBeTruthy()
  })

  it("un correo ya registrado se marca en el campo del correo", async () => {
    mockRegister.mockRejectedValue(new ApiError({ kind: "http", status: 409, serverMessage: "Ese correo ya tiene una cuenta." }))
    await render(<SafeAreaProvider initialMetrics={METRICS}><RegisterScreen /></SafeAreaProvider>)
    await fill()
    expect(await screen.findByText("Ese correo ya tiene una cuenta.")).toBeTruthy()
  })
})
