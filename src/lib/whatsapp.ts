/** "https://wa.me/14155238886?text=..." para abrir WhatsApp con el mensaje ya escrito. */
export function waLink(number: string, text: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`
}

/** "+14155238886" a "+1 415 523 8886"; otros formatos quedan como vienen. */
export function formatPhone(number: string): string {
  const us = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(number)
  if (us) return `+1 ${us[1]} ${us[2]} ${us[3]}`
  const pe = /^\+51(\d{3})(\d{3})(\d{3})$/.exec(number)
  if (pe) return `+51 ${pe[1]} ${pe[2]} ${pe[3]}`
  return number
}

/** Segundos que le quedan al codigo; 0 si ya vencio. */
export function secondsLeft(expiresAt: string | null, now: number): number {
  if (!expiresAt) return 0
  // El backend manda la hora de Lima sin zona: se lee como Lima (UTC-5, sin horario de verano).
  const end = Date.parse(/[zZ]|[+-]\d{2}:\d{2}$/.test(expiresAt) ? expiresAt : `${expiresAt}-05:00`)
  return Number.isNaN(end) ? 0 : Math.max(0, Math.floor((end - now) / 1000))
}

export function formatCountdown(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

export const WHATSAPP_EXAMPLES = ["almuerzo 15", "ayer taxi 12 y chifa 35 con yape", "me pagaron 800 del cachuelo"]

export const WHATSAPP_COMMANDS: { command: string; meaning: string }[] = [
  { command: "SALDO", meaning: "cuánto tienes disponible y tus fichas" },
  { command: "DESHACER", meaning: "borra lo último que anoté (hasta 1 hora después)" },
  { command: "¿…?", meaning: "una pregunta para el asistente, como «¿en qué gasté más este mes?»" },
]
