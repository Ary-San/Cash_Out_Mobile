import { http } from "@/api/client"
import type { AssistantStatus, ChatReply, ChatTurn } from "@/types/financeAssistant"

/** Preguntarle a Cash-Out por tus finanzas. Responde Claude con tus datos; no puede cambiar nada. */
export const financeAssistantService = {
  async status(signal?: AbortSignal): Promise<AssistantStatus> {
    const { data } = await http.get<AssistantStatus>("/finance-assistant/status", { signal })
    return data
  },

  /**
   * Manda la conversacion entera (termina con la pregunta). Puede tardar: el
   * asistente consulta tus datos antes de responder, asi que el timeout es mas largo.
   */
  async chat(messages: ChatTurn[], signal?: AbortSignal): Promise<ChatReply> {
    const { data } = await http.post<ChatReply>("/finance-assistant/chat", { messages }, { signal, timeout: 90_000 })
    return data
  },
}
