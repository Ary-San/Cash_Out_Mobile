import { fireEvent, render, screen, waitFor } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { router } from "expo-router"
import { parseRoomQr } from "@/lib/rooms"
import { betChips, clampBet } from "@/lib/updown"
import { streamEvents } from "@/services/eventStream"
import { updownService } from "@/services/updownService"
import type { UpDownView } from "@/types/updown"
import GamesScreen from "../app/(app)/(tabs)/games"
import UpDownRoomScreen from "../app/(app)/games/updown/[code]"

jest.mock("@/services/eventStream", () => ({ streamEvents: jest.fn() }))
jest.mock("@/services/updownService", () => ({
  updownService: { create: jest.fn(), join: jest.fn(), start: jest.fn(), vote: jest.fn(), reveal: jest.fn(), next: jest.fn(), cancel: jest.fn() },
}))
jest.mock("@/services/minigameService", () => ({ minigameService: { list: jest.fn(async () => []), sessions: jest.fn(async () => []) } }))
jest.mock("expo-keep-awake", () => ({ useKeepAwake: jest.fn() }))
jest.mock("react-native-qrcode-svg", () => () => null)
jest.mock("expo-router", () => ({ router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() }, useLocalSearchParams: () => ({ code: "k7m2qx" }), useNavigation: () => ({ dispatch: jest.fn() }), usePreventRemove: jest.fn() }))

const stream = streamEvents as jest.Mock
const api = updownService as jest.Mocked<typeof updownService>
const METRICS = { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }
const wrap = (node: React.ReactElement) => <SafeAreaProvider initialMetrics={METRICS}>{node}</SafeAreaProvider>

const player = { id: 1, rank: 1, name: "Valeria", points: 1000, hits: 0, voted: false, choice: null, bet: 0, delta: 0, me: true }
const base: UpDownView = {
  code: "K7M2QX", phase: "LOBBY", host: false, joined: false, maxPlayers: 40, startPoints: 1000, minBet: 10,
  round: 0, totalRounds: 8, secondsLeft: 0, votingSeconds: 20, question: null,
  tally: { answered: 0, options: [] }, ranking: [], me: null, history: [],
}
const voting: UpDownView = {
  ...base, phase: "VOTING", joined: true, round: 1, secondsLeft: 15,
  question: { sector: "Tecnología", period: "junio de 2022", context: "La Fed sube la tasa 0.75 puntos.", past: [96, 98, 100], future: null, reveal: null },
  ranking: [player], me: player,
}

/** El SSE de la sala manda este estado al conectarse y se queda abierto. */
const roomSends = (view: UpDownView) =>
  stream.mockImplementation((_path: string, onEvent: (e: { data: string }) => void) => {
    onEvent({ data: JSON.stringify(view) })
    return new Promise(() => undefined)
  })

beforeEach(() => jest.clearAllMocks())

describe("¿Sube o baja?: reglas", () => {
  it("reconoce el QR de la web y el codigo suelto, y descarta otros QR", () => {
    expect(parseRoomQr("https://cash-out-front-web.vercel.app/minijuegos/sube-o-baja/K7M2QX")).toEqual({ game: "updown", code: "K7M2QX" })
    expect(parseRoomQr("https://cash-out-front-web.vercel.app/minijuegos/arma-tu-portafolio/P4RT01")).toEqual({ game: "portfolio", code: "P4RT01" })
    expect(parseRoomQr("k7m2qx")).toEqual({ game: null, code: "K7M2QX" })
    expect(parseRoomQr("20123456789|01|F001|123|18.00|118.00")).toBeNull()
  })

  it("la apuesta va de 10 a todo lo que tienes, con atajos redondeados", () => {
    expect(clampBet(5, 1000, 10)).toBe(10)
    expect(clampBet(5000, 1000, 10)).toBe(1000)
    expect(betChips(1000, 10).map((chip) => chip.value)).toEqual([100, 250, 500, 1000])
  })
})

describe("¿Sube o baja?: salas", () => {
  it("crear una sala lleva a la sala como anfitrion", async () => {
    api.create.mockResolvedValue({ ...base, host: true })
    await render(wrap(<GamesScreen />))
    // El primero es el de ¿Sube o baja?; el segundo, el de Arma tu portafolio.
    await fireEvent.press(screen.getAllByText("Crear sala")[0])
    await waitFor(() => expect(router.push).toHaveBeenCalledWith({ pathname: "/games/updown/[code]", params: { code: "K7M2QX" } }))
  })

  it("el anfitrion ve el codigo y solo puede empezar cuando hay jugadores", async () => {
    roomSends({ ...base, host: true, ranking: [{ ...player, me: false }] })
    api.start.mockResolvedValue({ ...voting, host: true, me: null })
    await render(wrap(<UpDownRoomScreen />))

    expect(await screen.findByText("K7M2QX")).toBeTruthy()
    expect(screen.getByText("Valeria")).toBeTruthy()
    await fireEvent.press(screen.getByText("Empezar"))
    expect(api.start).toHaveBeenCalledWith("K7M2QX")
  })

  it("el jugador vota y apuesta en la ronda", async () => {
    roomSends(voting)
    api.vote.mockResolvedValue({ ...voting, me: { ...player, voted: true, choice: "UP", bet: 250 } })
    await render(wrap(<UpDownRoomScreen />))

    expect(await screen.findByText("La Fed sube la tasa 0.75 puntos.")).toBeTruthy()
    await fireEvent.press(screen.getByLabelText("Sube"))
    await fireEvent.press(screen.getByText("25 %"))
    await fireEvent.press(screen.getByText("Confirmar apuesta"))
    await waitFor(() => expect(api.vote).toHaveBeenCalledWith("K7M2QX", "UP", 250))
    expect(await screen.findByText("Apostaste 250 pts a que sube")).toBeTruthy()
  })
})
