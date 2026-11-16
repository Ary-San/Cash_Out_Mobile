import { z } from "zod"
import { amountOrZeroField, amountToField, toCents } from "@/lib/amount"
import { formatSoles } from "@/lib/format"
import type { Projection, ProjectionParams } from "@/types/projections"

/** Los campos tal como se escriben; la TEA va en porcentaje y la API la recibe entre 0 y 1. */
export interface ProjectionFields {
  initialCapital: string
  monthlyContribution: string
  annualRatePercent: string
  periods: string
}

// Las mismas reglas que la web y que ProjectionPreviewRequest en el backend.
const projectionSchema = z
  .object({
    initialCapital: amountOrZeroField,
    monthlyContribution: amountOrZeroField,
    annualRatePercent: z
      .string()
      .trim()
      .min(1, { error: "Ingresa la TEA; puede ser 0." })
      .regex(/^\d{1,3}(?:[.,]\d{1,4})?$/, { error: "Escribe la TEA con hasta 4 decimales, como 7.5." })
      .transform((value) => Number(value.replace(",", ".")))
      .refine((value) => value <= 100, { error: "La TEA no puede pasar de 100 %." }),
    periods: z
      .string()
      .trim()
      .min(1, { error: "Ingresa el plazo en meses." })
      .regex(/^\d{1,3}$/, { error: "El plazo es un número entero de meses." })
      .transform(Number)
      .refine((value) => value >= 1 && value <= 600, { error: "El plazo va de 1 a 600 meses (50 años)." }),
  })
  .transform(({ annualRatePercent, ...rest }): ProjectionParams => ({ ...rest, annualRate: percentToRate(annualRatePercent) }))

export type ProjectionErrors = Partial<Record<keyof ProjectionFields, string>>

/** Los parametros listos para calcular, o el primer error de cada campo. */
export function parseProjection(fields: ProjectionFields): { params: ProjectionParams; errors: null } | { params: null; errors: ProjectionErrors } {
  const result = projectionSchema.safeParse(fields)
  if (result.success) return { params: result.data, errors: null }
  const errors: ProjectionErrors = {}
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof ProjectionFields
    errors[key] ??= issue.message
  }
  return { params: null, errors }
}

export const DEFAULT_FIELDS: ProjectionFields = { initialCapital: "500", monthlyContribution: "120", annualRatePercent: "5", periods: "24" }

/** Tasas de referencia para probar rapido; no son ofertas reales. Las mismas de la web. */
export const RATE_PRESETS = [
  { label: "Cuenta de ahorros", percent: 2 },
  { label: "Depósito a plazo", percent: 5 },
  { label: "Fondo mutuo", percent: 8 },
] as const

/** 7.5 → 0.075. El redondeo evita restos como 1.1 / 100 = 0.011000000000000001. */
export function percentToRate(percent: number): number {
  return Number((percent / 100).toFixed(6))
}

/** 0.075 → "7.5" */
export function rateToPercentText(rate: number): string {
  return String(Number((rate * 100).toFixed(4)))
}

/** Un escenario guardado, como se ve en los campos de la calculadora. */
export function projectionToFields(projection: ProjectionParams): ProjectionFields {
  return {
    initialCapital: amountToField(projection.initialCapital),
    monthlyContribution: amountToField(projection.monthlyContribution),
    annualRatePercent: rateToPercentText(projection.annualRate),
    periods: String(projection.periods),
  }
}

/** 24 → "2 años", 18 → "1 año y 6 meses", 1 → "1 mes". */
export function formatTerm(months: number): string {
  const years = Math.floor(months / 12)
  const rest = months % 12
  const yearsText = years === 1 ? "1 año" : `${years} años`
  const monthsText = rest === 1 ? "1 mes" : `${rest} meses`
  if (years === 0) return monthsText
  return rest === 0 ? yearsText : `${yearsText} y ${monthsText}`
}

/** "S/ 500.00 + S/ 120.00 al mes · TEA 5 % · 2 años" */
export function paramsSummary(projection: Pick<Projection, keyof ProjectionParams>): string {
  const contribution = projection.monthlyContribution > 0 ? ` + ${formatSoles(projection.monthlyContribution)} al mes` : ""
  return `${formatSoles(projection.initialCapital)}${contribution} · TEA ${rateToPercentText(projection.annualRate)} % · ${formatTerm(projection.periods)}`
}

/** TEA → tasa mensual equivalente, la misma que usa el backend: (1 + TEA)^(1/12) − 1. */
export function monthlyRate(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 12) - 1
}

/** Con interes compuesto, cuanto hay al cabo de `month` meses. */
function compoundAt(params: ProjectionParams, rate: number, month: number): number {
  const growth = Math.pow(1 + rate, month)
  return rate === 0
    ? params.initialCapital + params.monthlyContribution * month
    : params.initialCapital * growth + (params.monthlyContribution * (growth - 1)) / rate
}

export interface ProjectionCurve {
  contributed: number[]
  simple: number[]
  compound: number[]
}

/** Mes a mes, con las formulas del backend. Solo dibuja el grafico: los montos del resultado los calcula el servidor. */
export function projectionCurve(params: ProjectionParams): ProjectionCurve {
  const rate = monthlyRate(params.annualRate)
  const { initialCapital: capital, monthlyContribution: monthly } = params
  const months = Array.from({ length: params.periods + 1 }, (_, month) => month)
  return {
    contributed: months.map((month) => capital + monthly * month),
    simple: months.map((month) => capital * (1 + rate * month) + monthly * (month + (rate * month * (month - 1)) / 2)),
    compound: months.map((month) => compoundAt(params, rate, month)),
  }
}

export interface GoalReach {
  /** El primer mes en que el compuesto llega al objetivo; 0 si el capital ya alcanza, null si en 50 años no llega. */
  reachMonth: number | null
  /** Aporte mensual que hace falta para llegar justo al plazo; 0 si el capital ya alcanza. */
  needed: number
}

/** Si estos parametros llegan a un monto antes de un plazo en meses, y cuanto aportar si no. */
export function goalReach(params: ProjectionParams, target: number, deadlineMonths: number): GoalReach {
  const rate = monthlyRate(params.annualRate)
  let reachMonth: number | null = null
  for (let month = 0; month <= 600; month++) {
    if (compoundAt(params, rate, month) >= target) {
      reachMonth = month
      break
    }
  }
  const months = Math.max(deadlineMonths, 1)
  const growth = Math.pow(1 + rate, months)
  const annuity = rate === 0 ? months : (growth - 1) / rate
  return { reachMonth, needed: Math.max(0, Math.ceil((target - params.initialCapital * growth) / annuity)) }
}

/** Mismos datos, comparando montos en centimos: no se guarda dos veces el mismo escenario. */
export function sameParams(a: ProjectionParams, b: ProjectionParams): boolean {
  return (
    toCents(a.initialCapital) === toCents(b.initialCapital) &&
    toCents(a.monthlyContribution) === toCents(b.monthlyContribution) &&
    Math.abs(a.annualRate - b.annualRate) < 1e-9 &&
    a.periods === b.periods
  )
}
