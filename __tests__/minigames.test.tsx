import { fireEvent, render, screen, waitFor } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { compoundInterest } from "@/games/compoundInterest"
import { loanSimulator } from "@/games/loanSimulator"
import { loanTotal } from "@/lib/loans"
import { packFor, prepareRun, scoreFor } from "@/lib/minigames"
import { ApiError } from "@/api/errors"
import { financeService } from "@/services/financeService"
import { minigameService } from "@/services/minigameService"
import MinigamePlayScreen from "../app/(app)/games/play/[id]"

jest.mock("@/services/minigameService", () => ({ minigameService: { get: jest.fn(), play: jest.fn(), list: jest.fn(), sessions: jest.fn() } }))
jest.mock("@/services/financeService", () => ({ financeService: { wallet: jest.fn() } }))
jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: "3" }),
  useNavigation: () => ({ dispatch: jest.fn() }),
  usePreventRemove: jest.fn(),
}))

const api = minigameService as jest.Mocked<typeof minigameService>
const finance = financeService as jest.Mocked<typeof financeService>
const METRICS = { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }
const trivia = { id: 3, title: "Interés compuesto", type: "TRIVIA" as const, topic: "Interés compuesto", tokenCost: 0, maxTokenReward: 20 }

beforeEach(() => {
  jest.clearAllMocks()
  api.get.mockResolvedValue(trivia)
  finance.wallet.mockResolvedValue({ id: 1, tokenBalance: 120, updatedAt: "2026-11-23" })
})

describe("minijuegos de práctica: reglas", () => {
  it("el tema del catálogo elige el contenido, y el puntaje va de 0 a 100", () => {
    expect(packFor({ type: "TRIVIA", topic: "Interés compuesto" })).toBe(compoundInterest)
    expect(packFor({ type: "QUIZ", topic: "Interés compuesto" })).toBeNull()
    expect(scoreFor(6, 8)).toBe(75)
  })

  it("cada partida mezcla las opciones sin perder cuál es la correcta", () => {
    const run = prepareRun(compoundInterest, () => 0.3)
    if (run.type === "SIMULATION") throw new Error("debía ser trivia")
    const original = compoundInterest.questions.find((q) => q.prompt === run.questions[0].prompt)!
    expect(run.questions[0].options[run.questions[0].answer]).toBe(original.options[original.answer])
  })

  it("en préstamos la cuota más baja no siempre es la más barata", () => {
    const round = loanSimulator.rounds[0]
    const totals = round.offers.map((offer) => loanTotal(round.principal, offer))
    expect(totals[0]).toBeLessThan(totals[1])
  })
})

describe("minijuegos de práctica: partida", () => {
  it("se juega la trivia completa y al final se registra el puntaje (todas bien: 100)", async () => {
    api.play.mockResolvedValue({ id: 9, minigameTitle: trivia.title, score: 0, tokensSpent: 0, tokensEarned: 0, playedAt: "2026-11-23T10:00:00" })
    await render(<SafeAreaProvider initialMetrics={METRICS}><MinigamePlayScreen /></SafeAreaProvider>)

    await fireEvent.press(await screen.findByText("Empezar partida"))
    for (let i = 0; i < compoundInterest.questions.length; i++) {
      // La pregunta en pantalla (el orden se mezcla) y su respuesta correcta.
      const question = compoundInterest.questions.find((q) => screen.queryByText(q.prompt))!
      await fireEvent.press(screen.getByText(question.options[question.answer]))
      await fireEvent.press(screen.getByText(i === compoundInterest.questions.length - 1 ? "Ver resultado" : "Siguiente pregunta"))
    }

    await waitFor(() => expect(api.play).toHaveBeenCalledWith(3, 100))
    expect(await screen.findByText("Tu puntaje: 100 de 100")).toBeTruthy()
  })

  it("un juego pagado no deja empezar si no se pudo saber cuántas fichas tienes", async () => {
    api.get.mockResolvedValue({ ...trivia, tokenCost: 10 })
    finance.wallet.mockRejectedValue(new ApiError({ kind: "network" }))
    await render(<SafeAreaProvider initialMetrics={METRICS}><MinigamePlayScreen /></SafeAreaProvider>)

    expect(await screen.findByText("Reintentar")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Empezar partida" })).toBeDisabled()
  })
})
