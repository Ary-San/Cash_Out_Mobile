import { http } from "@/api/client"
import type { PageResponse } from "@/types/api"
import type { AppNotification } from "@/types/notifications"

/** El centro de avisos de la cuenta propia. */
export const notificationService = {
  async list(signal?: AbortSignal): Promise<PageResponse<AppNotification>> {
    const { data } = await http.get<PageResponse<AppNotification>>("/notifications", { params: { size: 30 }, signal })
    return data
  },

  /** El numero del globito; se consulta seguido, por eso es una ruta liviana. */
  async unread(signal?: AbortSignal): Promise<number> {
    const { data } = await http.get<{ unread: number }>("/notifications/unread-count", { signal })
    return data.unread
  },

  async markRead(id: number): Promise<void> {
    await http.post(`/notifications/${id}/read`)
  },

  async markAllRead(): Promise<void> {
    await http.post("/notifications/read-all")
  },
}
