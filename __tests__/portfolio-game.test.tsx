import { fireEvent, render, screen, waitFor } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { router } from "expo-router"
import { http } from "@/api/client"
import { ApiError } from "@/api/errors"
import { adjustWeight, diversification, totalWeight } from "@/lib/portfolioGame"
import { streamEvents } from "@/services/eventStream"
import { portfolioGameService } from "@/services/portfolioGameService"
import type { PortfolioGameView } from "@/types/portfolioGame"
import GamesScreen from "../app/(app)/(tabs)/games"
import PortfolioRoomScreen from "../app/(app)/games/portfolio/[code]"

jest.mock("@/services/eventStream", () => ({ streamEvents: jest.fn() }))
jest.mock("@/services/portfolioGameService", () => ({
  portfolioGameService: { create: jest.fn(), join: jest.fn(), start: jest.fn(), next: jest.fn(), allocate: jest.fn(), unready: jest.fn(), cancel: jest.fn() },
}))
jest.mock("@/api/client", () => ({ http: { get: jest.fn() } }))
jest.mock("expo-keep-awake", () => ({ useKeepAwake: jest.fn() }))
jest.mock("react-native-qrcode-svg", () => () => null)
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ code: "p4rt01" }),
  useNavigation: () => ({ dispatch: jest.fn() }),
  usePreventRemove: jest.fn(),
}))

const stream = streamEvents as jest.Mock
const api = portfolioGameService as jest.Mocked<typeof portfolioGameService>
const get = http.get as jest.Mock
const METRICS = { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }
const wrap = (node: React.ReactElement) => <SafeAreaProvider initialMetrics={METRICS}>{node}</SafeAreaProvider>

const sectors = [
  { key: "tech", name: "Tecnología", symbol: "XLK", kind: "Crecimiento", description: "Software y chips." },
  { key: "bonds", name: "Bonos", symbol: "AGG", kind: "Defensivo", description: "Deuda de alta calidad." },
]
const me = { id: 1, rank: 1, name: "Valeria", ready: false, weights: null, result: null, me: true }
const lobby: PortfolioGameView = {
  code: "P4RT01", phase: "LOBBY", host: false, joined: true, maxPlayers: 40, startValue: 10000, step: 0, totalSteps: 5,
  sectors, stages: [], ranking: [me], me, benchmark: null,
}

const roomSends = (view: PortfolioGameView) =>
  stream.mockImplementation((_path: string, onEvent: (e: { data: string }) => void) => {
    onEvent({ data: JSON.stringify(view) })
    return new Promise(() => undefined)
  })

beforeEach(() => jest.clearAllMocks())

describe("Arma tu portafolio: reglas", () => {
  it("reparte de 10 en 10 sin pasar del 100 % y avisa si esta concentrado", () => {
    let weights = adjustWeight({ tech: 90 }, "bonds", 30)
    expect(weights).toEqual({ tech: 90, bonds: 10 })
    weights = adjustWeight(weights, "tech", -100)
    expect(totalWeight(weights)).toBe(10)
    expect(diversification({ tech: 60, bonds: 40 }).tone).toBe("risk")
  })
})

describe("Arma tu portafolio: sala", () => {
  it("el jugador reparte el 100 % y queda listo", async () => {
    roomSends(lobby)
    api.allocate.mockResolvedValue({ ...lobby, me: { ...me, ready: true, weights: { tech: 50, bonds: 50 } } })
    await render(wrap(<PortfolioRoomScreen />))

    expect(await screen.findByText("Asigna el 100 % (faltan 100 %)")).toBeTruthy()
    for (let i = 0; i < 5; i++) await fireEvent.press(screen.getByLabelText("Agregar 10 % a Tecnología"))
    for (let i = 0; i < 5; i++) await fireEvent.press(screen.getByLabelText("Agregar 10 % a Bonos"))
    await fireEvent.press(screen.getByText("Estoy listo"))

    await waitFor(() => expect(api.allocate).toHaveBeenCalledWith("P4RT01", { tech: 50, bonds: 50 }))
    expect(await screen.findByText("Listo. Esperando a que el anfitrión empiece…")).toBeTruthy()
  })

  it("si el anfitrion tambien juega, arma su portafolio primero y Empezar le avisa si no esta listo", async () => {
    roomSends({ ...lobby, host: true, ranking: [me, { ...me, id: 2, name: "Ana", ready: true, me: false }] })
    await render(wrap(<PortfolioRoomScreen />))
    expect(await screen.findByText("Reparte el 100 %")).toBeTruthy()
    expect(screen.getByText("Empezar (tu portafolio no está listo)")).toBeTruthy()
  })

  it("con solo el codigo, la app busca de que juego es la sala antes de entrar", async () => {
    get.mockImplementation(async (url: string) => {
      if (url.startsWith("/updown-rooms")) throw new ApiError({ kind: "http", status: 404 })
      return { data: lobby }
    })
    await render(wrap(<GamesScreen />))
    await fireEvent.changeText(screen.getByLabelText("Código de la sala"), "p4rt01")
    await fireEvent.press(screen.getByText("Entrar"))
    await waitFor(() => expect(router.push).toHaveBeenCalledWith({ pathname: "/games/portfolio/[code]", params: { code: "P4RT01" } }))
  })
})
