import { fireEvent, render, screen, waitFor } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { AuthContext, type AuthContextValue } from "@/contexts/authContext"
import { autoRegisterService } from "@/services/autoRegisterService"
import type { User } from "@/types/auth"
import ShortcutScreen from "../app/(app)/settings/shortcut"

jest.mock("@/services/autoRegisterService", () => ({ autoRegisterService: { tokenStatus: jest.fn(), newToken: jest.fn(), revokeToken: jest.fn() } }))
jest.mock("expo-router", () => ({ router: { back: jest.fn(), push: jest.fn() }, useFocusEffect: jest.fn() }))
jest.mock("@/lib/confirm", () => ({ confirmAction: jest.fn(() => Promise.resolve(true)) }))

const api = autoRegisterService as jest.Mocked<typeof autoRegisterService>
const METRICS = { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }
const user = { id: 1, name: "Ana", email: "ana@utec.edu.pe", roles: ["USER"], twoFactorEnabled: true } as unknown as User

describe("Código de 2FA antes de crear un acceso (app)", () => {
  it("con 2FA, crear el token del atajo pide el código y lo manda", async () => {
    api.tokenStatus.mockResolvedValue({ active: false, createdAt: null, lastUsedAt: null })
    api.newToken.mockResolvedValue({ token: "cash_abc", createdAt: "2026-11-27T10:00:00" })
    await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <AuthContext value={{ user } as AuthContextValue}>
          <ShortcutScreen />
        </AuthContext>
      </SafeAreaProvider>,
    )

    await fireEvent.press(await screen.findByText("Crear token"))
    expect(await screen.findByText("Confirma con tu código")).toBeTruthy()
    await fireEvent.changeText(screen.getByLabelText("Código"), "123456")
    await fireEvent.press(screen.getByText("Confirmar"))
    await waitFor(() => expect(api.newToken).toHaveBeenCalledWith("123456"))
  })
})
