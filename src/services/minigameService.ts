import { http } from "@/api/client"
import type { Minigame, MinigameSession } from "@/types/minigames"

/** Los minijuegos de practica, de a uno: el catalogo vive en el backend y las preguntas, en la app. */
export const minigameService = {
  /** Solo los publicados. */
  async list(signal?: AbortSignal): Promise<Minigame[]> {
    const { data } = await http.get<Minigame[]>("/minigames", { signal })
    return data
  },

  async get(id: number, signal?: AbortSignal): Promise<Minigame> {
    const { data } = await http.get<Minigame>(`/minigames/${id}`, { signal })
    return data
  },

  /** Del mas reciente al mas antiguo. */
  async sessions(signal?: AbortSignal): Promise<MinigameSession[]> {
    const { data } = await http.get<MinigameSession[]>("/minigame-sessions", { signal })
    return data
  },

  /** Cobra el costo y acredita la recompensa en una sola operacion, al terminar la partida. */
  async play(minigameId: number, score: number): Promise<MinigameSession> {
    const { data } = await http.post<MinigameSession>("/minigame-sessions", { minigameId, score })
    return data
  },
}
