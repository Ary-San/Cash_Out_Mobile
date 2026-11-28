import { formatSoles } from "@/lib/format"
import type { SplitBalance, SplitMode } from "@/types/splits"

/** Lo que me toca a mi, para mostrarlo mientras se llena (el backend hace la cuenta final). */
export function previewMyShare(total: number, mode: SplitMode, includeMe: boolean, values: number[]): number | null {
  if (!Number.isFinite(total) || total <= 0) return null
  const cents = Math.round(total * 100)
  if (mode === "EQUAL") {
    const n = values.length + (includeMe ? 1 : 0)
    if (n === 0) return null
    return includeMe ? (Math.floor(cents / n) + (cents % n > 0 ? 1 : 0)) / 100 : 0
  }
  if (values.some((v) => !Number.isFinite(v) || v <= 0)) return null
  const others = mode === "AMOUNT" ? values.reduce((sum, v) => sum + Math.round(v * 100), 0) : values.reduce((sum, v) => sum + Math.round((cents * v) / 100), 0)
  return (cents - others) / 100
}

/** "Te debe S/ 30.00", "Le debes S/ 20.00" o "Están a mano (...)" cuando se cancelan. */
export function balanceText(b: SplitBalance): string {
  if (b.net > 0) return `Te debe ${formatSoles(b.net)}`
  if (b.net < 0) return `Le debes ${formatSoles(Math.abs(b.net))}`
  return `Están a mano (${formatSoles(b.owesMe)} y ${formatSoles(b.iOwe)})`
}
