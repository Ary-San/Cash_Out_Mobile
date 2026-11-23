import type { PortfolioGamePlayer, Weights } from "@/types/portfolioGame"

export const WEIGHT_STEP = 10

export const PORTFOLIO_GAME_RULES = [
  "Repartes el 100 % entre 8 sectores, de 10 en 10: tecnología, energía, bancos, oro, bonos y más.",
  "Cuando todos están listos, el anfitrión revela 5 semestres reales, entre 2022 y 2025, uno por uno.",
  "Cada sector rinde lo que rindió de verdad su ETF en ese semestre. Empiezas con 10 000 puntos.",
  "Gana el mejor rendimiento ajustado por riesgo: rendir mucho cuenta, pero sin sustos enormes.",
  "Es para aprender a diversificar: no se juegan fichas.",
]

/** El color de cada sector, por posicion en la paleta de series (la misma de la web). Bonos van en gris. */
const SECTOR_SERIES: Record<string, number | null> = { tech: 5, energy: 4, staples: 3, banks: 2, health: 6, small: 0, bonds: null, gold: 1 }

export function sectorColor(key: string, series: string[], muted: string): string {
  const index = SECTOR_SERIES[key]
  return index === null || index === undefined ? muted : series[index]
}

const DEFENSIVE = ["staples", "health", "bonds", "gold"]

export function totalWeight(weights: Weights): number {
  return Object.values(weights).reduce((sum, weight) => sum + weight, 0)
}

/** Suma o quita 10 %, sin pasar de 100 entre todos ni bajar de 0. */
export function adjustWeight(weights: Weights, key: string, delta: number): Weights {
  const current = weights[key] ?? 0
  const room = 100 - totalWeight(weights)
  const next = delta > 0 ? current + Math.min(delta, room) : Math.max(0, current + delta)
  return { ...weights, [key]: next }
}

export type DiversificationTone = "risk" | "warn" | "ok"

/** Una lectura rapida del reparto mientras se arma. */
export function diversification(weights: Weights): { text: string; tone: DiversificationTone } {
  const used = Object.values(weights).filter((weight) => weight > 0)
  const largest = Math.max(0, ...used)
  const defensive = DEFENSIVE.reduce((sum, key) => sum + (weights[key] ?? 0), 0)
  if (used.length <= 2) return { text: "Muy concentrado: un mal semestre te puede hundir.", tone: "risk" }
  if (largest >= 50) return { text: "La mitad o más en un solo sector: es una apuesta fuerte.", tone: "risk" }
  if (defensive === 0) return { text: "Diversificado, pero sin nada defensivo para una crisis.", tone: "warn" }
  return { text: "Bien repartido, con algo de defensa.", tone: "ok" }
}

/** Cuanto aporto cada sector al retorno de la etapa: peso por retorno, de mayor a menor impacto. */
export function contributions(weights: Weights, returns: Record<string, number>, limit = 3) {
  return Object.entries(weights)
    .filter(([, weight]) => weight > 0)
    .map(([key, weight]) => ({ key, weight, effect: (weight / 100) * (returns[key] ?? 0) }))
    .sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect))
    .slice(0, limit)
}

/** El cierre: si gano el que mas tuvo o el que rindio mas parejo. */
export function finalLesson(ranking: PortfolioGamePlayer[]): string | null {
  const best = ranking[0]
  if (!best?.result) return null
  const richest = ranking.reduce((top, player) => ((player.result?.value ?? 0) > (top.result?.value ?? 0) ? player : top), best)
  if (richest.id === best.id) {
    return `${best.name} ganó en rendimiento y en estabilidad: repartió entre sectores que no caen al mismo tiempo.`
  }
  return `Ganó ${best.name}, aunque ${richest.name} terminó con más puntos: rindió más, pero con sustos más grandes. ${best.name} rindió más parejo, y eso es el rendimiento ajustado por riesgo.`
}

// Con tres decimales se ve por que uno quedo arriba de otro con puntajes parecidos.
const score = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 3, maximumFractionDigits: 3 })

export function formatScore(value: number | null): string {
  return value === null ? "—" : score.format(value)
}
