import { fireEvent, render, screen } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { ApiError } from "@/api/errors"
import { DeleteAccountSheet } from "@/components/profile/DeleteAccountSheet"
import { userService } from "@/services/userService"
import type { User } from "@/types/auth"
import DetailsScreen from "../app/(app)/settings/details"
import PasswordScreen from "../app/(app)/settings/password"

jest.mock("@/services/userService", () => ({
  userService: { updateMe: jest.fn(), changePassword: jest.fn(), deleteMe: jest.fn(), uploadAvatar: jest.fn(), removeAvatar: jest.fn(), getAvatar: jest.fn() },
}))
jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: jest.fn() }))
jest.mock("expo-router", () => ({ router: { back: jest.fn() } }))

const mockUser: User = {
  id: 7, name: "Valeria Quispe", email: "valeria@cashout.test", roles: ["USER"], status: "ACTIVE",
  birthDate: "2005-03-14", createdAt: "2026-09-12T15:00:00",
}
// updateUser cambia el usuario de la sesion, como el AuthProvider de verdad.
const mockAuth = { user: mockUser, updateUser: jest.fn((next: User) => { mockAuth.user = next }), login: jest.fn(), logout: jest.fn() }
jest.mock("@/hooks/useAuth", () => ({ useAuth: () => mockAuth }))

const users = userService as jest.Mocked<typeof userService>
const METRICS = { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }
const renderIn = (node: React.ReactElement) => render(<SafeAreaProvider initialMetrics={METRICS}>{node}</SafeAreaProvider>)

beforeEach(() => {
  // clearAllMocks y no resetAllMocks: este ultimo borra los mocks de React Native que usan las pantallas.
  jest.clearAllMocks()
  mockAuth.user = mockUser
})

describe("Datos personales", () => {
  it("avisa los cambios sin guardar y, al guardar, actualiza la sesion para que el Resumen salude con el nombre nuevo", async () => {
    users.updateMe.mockResolvedValue({ ...mockUser, name: "Ana Quispe" })
    await renderIn(<DetailsScreen />)
    expect(screen.getByText("Todo está guardado")).toBeTruthy()

    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Ana Quispe")
    expect(screen.getByText("Cambios sin guardar")).toBeTruthy()
    expect(screen.getByText("Hola, Ana")).toBeTruthy()

    await fireEvent.press(screen.getByText("Guardar"))
    expect(await screen.findByText("Todo está guardado")).toBeTruthy()
    expect(users.updateMe).toHaveBeenCalledWith({ name: "Ana Quispe", birthDate: "2005-03-14" })
    expect(mockAuth.updateUser).toHaveBeenCalledWith(expect.objectContaining({ name: "Ana Quispe" }))
  })

  it("no deja guardar sin nombre", async () => {
    await renderIn(<DetailsScreen />)
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "  ")
    await fireEvent.press(screen.getByText("Guardar"))
    expect(await screen.findByText("Ingresa tu nombre.")).toBeTruthy()
    expect(users.updateMe).not.toHaveBeenCalled()
  })
})

describe("Contraseña", () => {
  const fill = async (current: string, next: string, repeat = next) => {
    await fireEvent.changeText(screen.getByLabelText("Contraseña actual"), current)
    await fireEvent.changeText(screen.getByLabelText("Contraseña nueva"), next)
    await fireEvent.changeText(screen.getByLabelText("Repite la contraseña nueva"), repeat)
    await fireEvent.press(screen.getByText("Cambiar contraseña"))
  }

  it("valida en el celular antes de llamar al backend", async () => {
    await renderIn(<PasswordScreen />)
    await fill("Actual2026!", "Nueva2026!", "Otra2026!")
    expect(await screen.findByText("Las contraseñas no coinciden.")).toBeTruthy()
    expect(users.changePassword).not.toHaveBeenCalled()
  })

  it("un 401 del backend es la contraseña actual equivocada, no la sesion", async () => {
    users.changePassword.mockRejectedValue(new ApiError({ kind: "http", status: 401 }))
    await renderIn(<PasswordScreen />)
    await fill("Equivocada1!", "Nueva2026!")
    expect(await screen.findByText("La contraseña actual no es correcta.")).toBeTruthy()
    expect(mockAuth.logout).not.toHaveBeenCalled()
  })

  it("si se cambia, vuelve a entrar con la nueva", async () => {
    users.changePassword.mockResolvedValue()
    mockAuth.login.mockResolvedValue(mockUser)
    await renderIn(<PasswordScreen />)
    await fill("Actual2026!", "Nueva2026!")
    await screen.findByText("Cambiar contraseña")
    expect(mockAuth.login).toHaveBeenCalledWith({ email: "valeria@cashout.test", password: "Nueva2026!" })
  })
})

describe("Eliminar cuenta", () => {
  it("solo elimina despues de escribir ELIMINAR, y luego cierra la sesion", async () => {
    users.deleteMe.mockResolvedValue()
    await renderIn(<DeleteAccountSheet visible onClose={jest.fn()} />)

    await fireEvent.press(screen.getByText("Eliminar"))
    expect(users.deleteMe).not.toHaveBeenCalled()

    await fireEvent.changeText(screen.getByLabelText("Escribe ELIMINAR para confirmar"), "eliminar")
    expect(screen.getByText("Listo: el botón Eliminar ya está activo.")).toBeTruthy()
    await fireEvent.press(screen.getByText("Eliminar"))
    await screen.findByText("Eliminar")
    expect(users.deleteMe).toHaveBeenCalled()
    expect(mockAuth.logout).toHaveBeenCalled()
  })
})
