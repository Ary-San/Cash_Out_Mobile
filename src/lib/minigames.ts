import { betOrInvest } from "@/games/betOrInvest"
import { compoundInterest } from "@/games/compoundInterest"
import { loanSimulator } from "@/games/loanSimulator"
import type { ChoiceQuestion, GamePack, LoanRound } from "@/games/types"
import type { Minigame, MinigameSession, MinigameType } from "@/types/minigames"

export const MINIGAME_TYPE_LABEL: Record<MinigameType, string> = {
  TRIVIA: "Trivia",
  QUIZ: "Quiz",
  SIMULATION: "Simulación",
}

/** Las preguntas viven en la app (las mismas de la web): el `topic` del catalogo dice cual se juega. */
const PACKS: Record<string, GamePack> = {
  "interes-compuesto": compoundInterest,
  "apuesta-o-inversion": betOrInvest,
  prestamos: loanSimulator,
}

/** "Apuesta o inversión" → "apuesta-o-inversion". */
export function topicKey(topic: string): string {
  return topic
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

/** null si la app no tiene contenido para ese tema o el tipo no coincide. */
export function packFor(game: Pick<Minigame, "type" | "topic">): GamePack | null {
  const pack = game.topic ? PACKS[topicKey(game.topic)] : undefined
  return pack && pack.type === game.type ? pack : null
}

/** El backend paga en proporcion a un puntaje de 0 a 100. */
export function scoreFor(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100)
}

export type GameRun = { type: "TRIVIA" | "QUIZ"; questions: ChoiceQuestion[] } | { type: "SIMULATION"; rounds: LoanRound[] }

export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function shuffleOptions(question: ChoiceQuestion, random: () => number): ChoiceQuestion {
  const order = shuffle(
    question.options.map((_, index) => index),
    random,
  )
  return { ...question, options: order.map((index) => question.options[index]), answer: order.indexOf(question.answer) }
}

/** Cada partida mezcla el orden, para que repetir no sea memorizar posiciones. */
export function prepareRun(pack: GamePack, random = Math.random): GameRun {
  if (pack.type === "SIMULATION") {
    return { type: pack.type, rounds: pack.rounds.map((round) => ({ ...round, offers: shuffle(round.offers, random) })) }
  }
  const questions = shuffle(pack.questions, random)
  return { type: pack.type, questions: pack.shuffleOptions ? questions.map((question) => shuffleOptions(question, random)) : questions }
}

export function runLength(run: GameRun): number {
  return run.type === "SIMULATION" ? run.rounds.length : run.questions.length
}

/** Cuantas veces se jugo cada juego y su mejor puntaje; las partidas solo traen el titulo. */
export function gameStats(sessions: MinigameSession[]): Map<string, { plays: number; best: number }> {
  const stats = new Map<string, { plays: number; best: number }>()
  for (const session of sessions) {
    const current = stats.get(session.minigameTitle) ?? { plays: 0, best: 0 }
    stats.set(session.minigameTitle, { plays: current.plays + 1, best: Math.max(current.best, session.score) })
  }
  return stats
}

/** Los gratis primero: son la puerta de entrada para quien todavia no tiene fichas. */
export function sortByCost(games: Minigame[]): Minigame[] {
  return [...games].sort((a, b) => a.tokenCost - b.tokenCost || a.title.localeCompare(b.title, "es"))
}

export function verdict(score: number): string {
  if (score >= 90) return "¡Excelente!"
  if (score >= 60) return "Bien jugado."
  return "Puedes volver a intentarlo cuando quieras."
}
