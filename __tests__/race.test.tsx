import { Alert } from "react-native"
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { parseRoomQr } from "@/lib/rooms"
import { mergeRaceView } from "@/lib/race"
import { streamEvents } from "@/services/eventStream"
import { raceService } from "@/services/raceService"
import type { RaceView } from "@/types/race"
import { RaceRanking } from "@/components/race/RaceBoards"
import RaceRoomScreen from "../app/(app)/games/race/[code]"

jest.mock("@/services/eventStream", () => ({ streamEvents: jest.fn() }))
jest.mock("@/services/raceService", () => ({ raceService: { create: jest.fn(), join: jest.fn(), start: jest.fn(), cancel: jest.fn(), trade: jest.fn() } }))
jest.mock("expo-keep-awake", () => ({ useKeepAwake: jest.fn() }))
jest.mock("react-native-qrcode-svg", () => () => null)
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), navigate: jest.fn() },
  useLocalSearchParams: () => ({ code: "r4c3x1" }),
  useNavigation: () => ({ dispatch: jest.fn() }),
  usePreventRemove: jest.fn(),
}))

const stream = streamEvents as jest.Mock
const api = raceService as jest.Mocked<typeof raceService>
const METRICS = { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }
const wrap = (node: React.ReactElement) => <SafeAreaProvider initialMetrics={METRICS}>{node}</SafeAreaProvider>

const racer = { id: 1, rank: 1, name: "Valeria", value: 10000, returnPercent: 0, investedPercent: 0, cash: 10000, prize: 0, me: true }
const lobby: RaceView = {
  code: "R4C3X1", phase: "LOBBY", host: false, joined: false, entryFee: 20, pot: 40, maxPlayers: 40,
  step: 0, totalSteps: 90, countdown: 0, price: 100, prices: [100], ranking: [], me: null, scenario: null,
}
const running: RaceView = { ...lobby, phase: "RUNNING", joined: true, step: 2, price: 101.5, prices: [100, 100.8, 101.5], ranking: [racer], me: racer }

const roomSends = (view: RaceView) =>
  stream.mockImplementation((_path: string, onEvent: (e: { data: string }) => void) => {
    onEvent({ data: JSON.stringify(view) })
    return new Promise(() => undefined)
  })

beforeEach(() => jest.clearAllMocks())

describe("Carrera: reglas", () => {
  it("los ticks solo traen el precio del paso y se suman a la serie", () => {
    const tick = { ...running, step: 3, price: 102, prices: null }
    expect(mergeRaceView(running, tick).prices).toEqual([100, 100.8, 101.5, 102])
  })

  it("fuera del top, tu fila aparece igual al final del ranking", async () => {
    const field = Array.from({ length: 7 }, (_, i) => ({ ...racer, id: i + 1, rank: i + 1, name: `Jugador ${i + 1}`, me: i === 6 }))
    await render(<RaceRanking ranking={field} limit={5} />)
    expect(screen.getByText("Jugador 5")).toBeTruthy()
    expect(screen.queryByText("Jugador 6")).toBeNull()
    expect(screen.getByText("Jugador 7 (tú)")).toBeTruthy()
  })

  it("reconoce el QR de la carrera de la web", () => {
    expect(parseRoomQr("https://cash-out-front-web.vercel.app/carrera/R4C3X1")).toEqual({ game: "race", code: "R4C3X1" })
  })
})

describe("Carrera: sala", () => {
  it("entrar con cuota pide confirmar el pago en fichas antes de cobrar", async () => {
    roomSends(lobby)
    const alert = jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => buttons?.[1]?.onPress?.())
    api.join.mockResolvedValue({ ...lobby, joined: true, ranking: [racer], me: racer })
    await render(wrap(<RaceRoomScreen />))

    await fireEvent.press(await screen.findByText("Entrar por 20.00 fichas"))
    expect(alert).toHaveBeenCalledWith("¿Entrar por 20.00 fichas?", expect.any(String), expect.any(Array), expect.any(Object))
    await waitFor(() => expect(api.join).toHaveBeenCalledWith("R4C3X1"))
    alert.mockRestore()
  })

  it("en la carrera se compra la parte elegida", async () => {
    roomSends(running)
    api.trade.mockResolvedValue({ ...running, me: { ...racer, investedPercent: 25 } })
    await render(wrap(<RaceRoomScreen />))

    await fireEvent.press(await screen.findByText("25 %"))
    await fireEvent.press(screen.getByText("Comprar"))
    await waitFor(() => expect(api.trade).toHaveBeenCalledWith("R4C3X1", "BUY", 0.25))
    expect(await screen.findByText(/^Compraste 25 % a 101[.,]50$/)).toBeTruthy()
  })
})
