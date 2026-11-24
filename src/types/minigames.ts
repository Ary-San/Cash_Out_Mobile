export type MinigameType = "TRIVIA" | "QUIZ" | "SIMULATION"

/** MinigameResponse: un juego del catalogo, con lo que cuesta y lo que paga como maximo. */
export interface Minigame {
  id: number
  title: string
  type: MinigameType
  topic: string | null
  tokenCost: number
  maxTokenReward: number
}

/** MinigameSessionResponse: una partida registrada. */
export interface MinigameSession {
  id: number
  minigameTitle: string
  score: number
  tokensSpent: number
  tokensEarned: number
  playedAt: string
}
