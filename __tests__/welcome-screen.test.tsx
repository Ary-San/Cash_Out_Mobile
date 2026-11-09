import { AccessibilityInfo } from "react-native"
import { fireEvent, render, screen } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { router } from "expo-router"
import WelcomeScreen from "../app/(auth)/welcome"

// La seda es un shader de Skia: en las pruebas no hay GPU, se reemplaza por nada.
jest.mock("@/components/welcome/SilkBackground", () => ({ SilkBackground: () => null }))
jest.mock("expo-router", () => ({ router: { push: jest.fn() }, useFocusEffect: jest.fn() }))

const METRICS = { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }
const renderWelcome = () => render(<SafeAreaProvider initialMetrics={METRICS}><WelcomeScreen /></SafeAreaProvider>)

beforeEach(() => jest.clearAllMocks())

describe("Bienvenida", () => {
  it("cuenta la promesa con el ejemplo real de las fichas y lleva a crear cuenta o entrar", async () => {
    await renderWelcome()
    expect(screen.getByRole("header")).toHaveTextContent(/sin arriesgar tu dinero/)
    // Meta de S/ 2,000: el 1 % en fichas, la misma regla que usa la app.
    expect(screen.getByLabelText(/Laptop de S\/ 2,000.00 se cumple y te da 20 fichas/)).toBeTruthy()
    // En pantalla se dice que es un ejemplo, no la meta de quien abre la app.
    expect(screen.getByText("Ejemplo · Laptop")).toBeTruthy()

    await fireEvent.press(screen.getByText("Crear cuenta gratis"))
    expect(router.push).toHaveBeenCalledWith("/register")
    await fireEvent.press(screen.getByText("Ya tengo cuenta"))
    expect(router.push).toHaveBeenCalledWith("/login")
  })

  it("con reducir movimiento muestra la meta ya cumplida, sin animarla", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true)
    await renderWelcome()
    expect(await screen.findByText("100 %")).toBeTruthy()
    expect(screen.getByText("¡Meta cumplida!")).toBeTruthy()
  })
})
