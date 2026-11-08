import { http } from "@/api/client"
import type { GmailScanResult, GmailStatus, IngestTokenStatus, NewIngestToken } from "@/types/autoRegister"

/** Registro automatico: el atajo de iPhone (token) y los correos del banco (Gmail). */
export const autoRegisterService = {
  async tokenStatus(signal?: AbortSignal): Promise<IngestTokenStatus> {
    const { data } = await http.get<IngestTokenStatus>("/ingest-token", { signal })
    return data
  },

  /** Crea el token o lo cambia: el anterior deja de funcionar. */
  async newToken(): Promise<NewIngestToken> {
    const { data } = await http.post<NewIngestToken>("/ingest-token")
    return data
  },

  async revokeToken(): Promise<void> {
    await http.delete("/ingest-token")
  },

  async gmailStatus(signal?: AbortSignal): Promise<GmailStatus> {
    const { data } = await http.get<GmailStatus>("/gmail", { signal })
    return data
  },

  /** La direccion de Google para dar el permiso de solo lectura. */
  async gmailConnectUrl(): Promise<string> {
    const { data } = await http.post<{ url: string }>("/gmail/connect")
    return data.url
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
