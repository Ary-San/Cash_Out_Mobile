import { http } from "@/api/client"
import type { RaceSide, RaceView } from "@/types/race"

/** Salas de la carrera de trading: las mismas de la web, asi que celulares y laptops corren juntos. */
export const raceService = {
  /** Abre una sala con un escenario al azar; quien la crea es el anfitrion. */
  async create(entryFee: number): Promise<RaceView> {
    const { data } = await http.post<RaceView>("/race-rooms", { entryFee })
    return data
  },

  /** Cobra la cuota en fichas. Entrar dos veces no cobra dos veces. */
  async join(code: string): Promise<RaceView> {
    const { data } = await http.post<RaceView>(`/race-rooms/${code}/join`)
    return data
  },

  async start(code: string): Promise<RaceView> {
    const { data } = await http.post<RaceView>(`/race-rooms/${code}/start`)
    return data
  },

  /** Solo antes de empezar; devuelve las cuotas. */
  async cancel(code: string): Promise<void> {
    await http.post(`/race-rooms/${code}/cancel`)
  },

  /** Compra o vende una parte (0.25, 0.5 o 1) de lo que se puede. */
  async trade(code: string, side: RaceSide, fraction: number): Promise<RaceView> {
    const { data } = await http.post<RaceView>(`/race-rooms/${code}/trades`, { side, fraction })
    return data
  },
}
