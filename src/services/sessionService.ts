import { http } from "@/api/client"
import type { ConnectionInfo, SessionInfo } from "@/types/sessions"

/** Las sesiones abiertas de la cuenta propia. */
export const sessionService = {
  async list(signal?: AbortSignal): Promise<SessionInfo[]> {
    const { data } = await http.get<SessionInfo[]>("/users/me/sessions", { signal })
    return data
  },

  /** La saca en el acto: su token deja de servir aunque no haya vencido. */
  async close(id: string): Promise<void> {
    await http.delete(`/users/me/sessions/${encodeURIComponent(id)}`)
  },

  /** Todas menos esta, y tambien WhatsApp y el atajo. Devuelve cuantas sesiones y accesos cerro. */
  async closeOthers(): Promise<{ closed: number; connections: number }> {
    const { data } = await http.post<{ closed: number; connections: number }>("/users/me/sessions/close-others")
    return data
  },

  async connections(signal?: AbortSignal): Promise<ConnectionInfo[]> {
    const { data } = await http.get<ConnectionInfo[]>("/users/me/connections", { signal })
    return data
  },

  async closeConnection(kind: ConnectionInfo["kind"]): Promise<void> {
    await http.delete(`/users/me/connections/${kind.toLowerCase()}`)
  },
}
