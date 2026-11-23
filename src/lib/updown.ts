import type { UpDownChoice } from "@/types/updown"

/** El backend corta en 2 %: "Igual" gana si el mes termino entre −2 % y +2 %. */
export const FLAT_BAND = 2

export const UPDOWN_CHOICES: { value: UpDownChoice; label: string; icon: string; tone: "gain" | "accent" | "loss" }[] = [
  { value: "UP", label: "Sube", icon: "▲", tone: "gain" },
  { value: "FLAT", label: "Igual", icon: "▬", tone: "accent" },
  { value: "DOWN", label: "Baja", icon: "▼", tone: "loss" },
]

export const UPDOWN_RULES = [
  "Cada ronda muestra un activo real hasta el día de una noticia: un índice, un sector o una empresa.",
  "Predices qué hizo el mes siguiente: sube, baja o queda igual (entre −2 % y +2 %).",
  "Empiezas con 1000 puntos y apuestas entre 10 y todo lo que tengas: si aciertas los ganas, si fallas los pierdes.",
  "Tienes 20 segundos por ronda. Al revelar se ve qué era y por qué se movió así.",
  "Son 8 rondas y gana quien termine con más puntos. Es para aprender: no se juegan fichas.",
]

export function choiceMeta(choice: UpDownChoice) {
  return UPDOWN_CHOICES.find((option) => option.value === choice)!
}

/** La apuesta minima es 10, o todo lo que quede si son menos. */
export function minBet(points: number, min: number): number {
  return Math.min(min, points)
}

export function clampBet(bet: number, points: number, min: number): number {
  return Math.max(minBet(points, min), Math.min(points, Math.round(bet)))
}

/** Atajos de 10 %, 25 %, 50 % y todo, redondeados a 10. Los mismos de la web. */
export function betChips(points: number, min: number): { label: string; value: number }[] {
  return [
    { label: "10 %", share: 0.1 },
    { label: "25 %", share: 0.25 },
    { label: "50 %", share: 0.5 },
    { label: "Todo", share: 1 },
  ].map(({ label, share }) => ({
    label,
    value: share === 1 ? points : clampBet(Math.round((points * share) / 10) * 10, points, min),
  }))
}

/** "+3.4 %" o "−1.2 %" */
export function formatChange(percent: number): string {
  const sign = percent > 0 ? "+" : percent < 0 ? "−" : ""
  return `${sign}${Math.abs(percent).toFixed(1)} %`
}
