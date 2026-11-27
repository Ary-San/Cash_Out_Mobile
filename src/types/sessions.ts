/** GET /users/me/sessions: una sesion abierta de la cuenta. */
export interface SessionInfo {
  /** Para cerrarla. */
  id: string
  /** "Chrome en Windows", "App Cash-Out en Android (Pixel 7)"; null si no se supo. */
  device: string | null
  /** Aproximada, por la IP: "Miraflores, Lima"; null si no se supo. */
  location: string | null
  /** Tapada a medias: "190.235.•.•". */
  ip: string | null
  /** ISO con desfase. */
  startedAt: string
  lastUsedAt: string
  /** Es la sesion desde la que se mira. */
  current: boolean
}

/**
 * GET /users/me/connections: un acceso que no es una sesion (WhatsApp vinculado,
 * atajo de iPhone, Gmail). Sobrevive a cerrar las sesiones, por eso se lista aparte.
 */
export interface ConnectionInfo {
  kind: "WHATSAPP" | "SHORTCUT" | "GMAIL"
  label: string
  /** El numero tapado, el correo, o que hace. */
  detail: string
  since: string | null
  lastUsedAt: string | null
}

