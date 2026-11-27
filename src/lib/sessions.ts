import type { SessionInfo } from "@/types/sessions"

/** "ahora", "hace 5 min", "hace 3 h", "hace 2 días": cuando se uso por ultima vez. */
export function lastActive(iso: string, now: number = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000))
  if (minutes < 1) return "ahora"
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} ${days === 1 ? "día" : "días"}`
}

/** Celular o computadora, para el icono. */
export function isPhone(session: SessionInfo): boolean {
  return /Android|iPhone|iPad|App Cash-Out/i.test(session.device ?? "")
}

/** Lo que se lee de una sesion, tambien para el lector de pantalla. */
export function sessionSummary(session: SessionInfo, now: number = Date.now()): string {
  return [
    session.device ?? "Dispositivo desconocido",
    session.location ?? "ubicación desconocida",
    session.current ? "este dispositivo" : `activa ${lastActive(session.lastUsedAt, now)}`,
  ].join(", ")
}
