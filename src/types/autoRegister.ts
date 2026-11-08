/** GET /gmail. */
export interface GmailStatus {
  /** false si el servidor no tiene configurado el cliente de Google. */
  available: boolean
  connected: boolean
  email: string | null
  /** EXPIRED: Google ya no acepta el permiso; hay que reconectar. */
  status: "ACTIVE" | "EXPIRED" | null
  lastCheckedAt: string | null
}

export interface GmailScanResult {
  read: number
  added: number
}

/** GET /ingest-token: el token del atajo de iPhone. */
export interface IngestTokenStatus {
  active: boolean
  createdAt: string | null
  lastUsedAt: string | null
}

export interface NewIngestToken {
  /** Se muestra una sola vez: el backend solo guarda su huella. */
  token: string
  createdAt: string
}
