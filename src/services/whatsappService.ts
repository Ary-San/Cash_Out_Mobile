import { http } from "@/api/client"
import type { WhatsAppStatus } from "@/types/whatsapp"

/** Registrar movimientos escribiendo por WhatsApp. */
export const whatsappService = {
  async status(signal?: AbortSignal): Promise<WhatsAppStatus> {
    const { data } = await http.get<WhatsAppStatus>("/whatsapp", { signal })
    return data
  },

  /** Un codigo nuevo para mandar desde WhatsApp; vale 15 minutos y el anterior deja de servir. */
  async link(): Promise<WhatsAppStatus> {
    const { data } = await http.post<WhatsAppStatus>("/whatsapp/link")
    return data
  },

  async unlink(): Promise<void> {
    await http.delete("/whatsapp")
  },
}
