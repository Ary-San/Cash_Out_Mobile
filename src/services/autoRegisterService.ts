import { http } from "@/api/client"
import type { GmailScanResult, GmailStatus, IngestTokenStatus, NewIngestToken } from "@/types/autoRegister"

/** Registro automatico: el atajo de iPhone (token) y los correos del banco (Gmail). */
export const autoRegisterService = {
  async tokenStatus(signal?: AbortSignal): Promise<IngestTokenStatus> {
    const { data } = await http.get<IngestTokenStatus>("/ingest-token", { signal })
    return data
  },

  /** Crea el token o lo cambia: el anterior deja de funcionar. */
  /** Con verificacion en dos pasos, el backend pide tambien su codigo. */
  async newToken(twoFactorCode?: string): Promise<NewIngestToken> {
    const { data } = await http.post<NewIngestToken>("/ingest-token", twoFactorCode ? { twoFactorCode } : undefined)
    return data
  },

  async revokeToken(): Promise<void> {
    await http.delete("/ingest-token")
  },

  async gmailStatus(signal?: AbortSignal): Promise<GmailStatus> {
    const { data } = await http.get<GmailStatus>("/gmail", { signal })
    return data
  },

  /**
   * La direccion de Google para dar el permiso de solo lectura.
   *
   * @param returnTo a donde vuelve Google al terminar: un enlace que abre esta app.
   *                 El backend solo acepta los de la app (su esquema o su proyecto de Expo).
   */
  async gmailConnectUrl(returnTo: string, twoFactorCode?: string): Promise<string> {
    const { data } = await http.post<{ url: string }>("/gmail/connect", { returnTo, ...(twoFactorCode ? { twoFactorCode } : {}) })
    return data.url
  },

  /**
   * Cierra la conexion con el ticket que trajo la vuelta de Google. La vuelta llega
   * sin sesion, asi que solo quien esta dentro de la cuenta que lo pidio puede
   * confirmarlo: sin este paso, ese enlace serviria para quedarse con el Gmail de otro.
   */
  async confirmGmail(ticket: string): Promise<GmailStatus> {
    const { data } = await http.post<GmailStatus>("/gmail/confirm", { ticket })
    return data
  },

  /** Lee los correos del banco del mes; again=true devuelve tambien lo descartado del mes. */
  async scanGmailMonth(again: boolean): Promise<GmailScanResult> {
    const { data } = await http.post<GmailScanResult>("/gmail/scan", null, { params: { again } })
    return data
  },

  async disconnectGmail(): Promise<void> {
    await http.delete("/gmail")
  },
}
