import { http } from "@/api/client"
import type { WhatsAppStatus } from "@/types/whatsapp"

/** Registrar movimientos escribiendo por WhatsApp. */
export const whatsappService = {
  async status(signal?: AbortSignal): Promise<WhatsAppStatus> {
    const { data } = await http.get<WhatsAppStatus>("/whatsapp", { signal })
    return data
  },

  /** Un codigo nuevo para mandar desde WhatsApp; vale 15 minutos y el anterior deja de servir. */
  /** Con verificacion en dos pasos, el backend pide tambien su codigo. */
  async link(twoFactorCode?: string): Promise<WhatsAppStatus> {
    const { data } = await http.post<WhatsAppStatus>("/whatsapp/link", twoFactorCode ? { twoFactorCode } : undefined)
    return data
  },

  async unlink(): Promise<void> {
    await http.delete("/whatsapp")
  },
}
