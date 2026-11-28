/** Un aviso del centro de avisos (la campanita). */
export interface AppNotification {
  id: number
  type: "BUDGET" | "SECURITY" | "GOAL" | "ORDER" | "GENERAL"
  title: string
  body: string
  /** Ruta de la web a la que lleva ("/metas"); la app la traduce con appRoute. null si a ninguna. */
  link: string | null
  read: boolean
  /** ISO con desfase. */
  createdAt: string
}
