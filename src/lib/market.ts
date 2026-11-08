import type { AssetType, OrderSide, OrderStatus } from "@/types/market"

export const ASSET_TYPE_LABEL: Record<AssetType, string> = { STOCK: "Acción", ETF: "ETF", FUND: "Fondo", CRYPTO: "Cripto" }
export const ORDER_SIDE_LABEL: Record<OrderSide, string> = { BUY: "Compra", SELL: "Venta" }
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  EXECUTED: "Ejecutada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
}

/** Decimales de cantidad que se permiten escribir. El backend guarda 8; 6 sobran para una persona. */
export const QUANTITY_DECIMALS = 6
const QUANTITY_FACTOR = 10 ** QUANTITY_DECIMALS

const two = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const four = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })
const quantity = new Intl.NumberFormat("es-PE", { maximumFractionDigits: QUANTITY_DECIMALS })

// Lo que se redondea a 0.00 no lleva signo: "−0.00 %" confunde.
const sign = (value: number) => (value >= 0.005 ? "+" : value <= -0.005 ? "−" : "")

/** 333.75 → "US$ 333.75". Lo de menos de 1 dolar va con 4 decimales. */
export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—"
  return `US$ ${(Math.abs(value) < 1 ? four : two).format(value)}`
}

/** 420.5 → "420.50". Las fichas sin la palabra, para cifras con su etiqueta al lado. */
export function formatTokenAmount(value: number): string {
  return two.format(value)
}

/** 420.5 → "420.50 fichas". */
export function formatTokens(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—"
  return `${two.format(value)} fichas`
}

/** 12.5 → "+12.50"; sin la palabra fichas. */
export function formatSigned(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—"
  return `${sign(value)}${two.format(Math.abs(value))}`
}

/** 12.5 → "+12.50 fichas". */
export function formatSignedTokens(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—"
  return `${formatSigned(value)} fichas`
}

/** 1.5 → "+1.50 %"; null → "—". */
export function formatSignedPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—"
  return `${sign(value)}${two.format(Math.abs(value))} %`
}

export function formatQuantity(value: number): string {
  return quantity.format(value)
}

/** Cuantas acciones se compran con tantas fichas. Se trunca: el costo nunca supera lo que se quiso gastar. */
export function tokensToQuantity(amount: number, price: number): number {
  if (price <= 0) return 0
  return Math.floor((amount / price) * QUANTITY_FACTOR) / QUANTITY_FACTOR
}

/** Fichas que mueve una orden, como las calcula el backend (redondeo a centavos). */
export function quantityToTokens(qty: number, price: number): number {
  return Math.round(qty * price * 100) / 100
}

/** Ganancia en % sobre lo invertido; null si no hay base. */
export function returnPercent(pnl: number | null | undefined, cost: number | null | undefined): number | null {
  if (pnl === null || pnl === undefined || !cost) return null
  return (pnl / cost) * 100
}

/** "gain", "loss" o "" para el tono de una variacion. */
export function changeTone(value: number | null | undefined): "gain" | "loss" | "muted" {
  if (value === null || value === undefined || Math.abs(value) < 0.005) return "muted"
  return value > 0 ? "gain" : "loss"
}

// Alpaca agrega la clase de accion al nombre ("Apple Inc. Common Stock"); para el titulo sobra.
const SHARE_CLASS = /\s+(?:Class [A-Z]\s+)?(?:Common Stock|Common Shares|Ordinary Shares|American Depositary Shares)$/i

/** "Apple Inc. Common Stock" → "Apple Inc." */
export function displayName(name: string): string {
  return name.replace(SHARE_CLASS, "").trim() || name
}

/** "BTC-USD" → "BTC": la unidad de una cripto; las demas se cuentan en acciones. */
export function unitOf(symbol: string, type: AssetType, qty?: number): string {
  if (type === "CRYPTO") return symbol.replace(/-USD$/, "")
  return qty === 1 ? "acción" : "acciones"
}

const QUANTITY_PATTERN = new RegExp(`^\\d{1,9}(?:[.,]\\d{1,${QUANTITY_DECIMALS}})?$`)
const TOKENS_PATTERN = /^\d{1,9}(?:[.,]\d{1,2})?$/

/** Lo escrito en el campo de la orden, o el error para mostrar debajo. */
export function parseOrderValue(text: string, mode: "tokens" | "quantity"): { value: number } | { error: string } {
  const trimmed = text.trim()
  if (!trimmed) return { error: mode === "tokens" ? "Ingresa el monto." : "Ingresa la cantidad." }
  if (mode === "tokens" && !TOKENS_PATTERN.test(trimmed)) return { error: "Escribe un monto con hasta 2 decimales, como 25.50." }
  if (mode === "quantity" && !QUANTITY_PATTERN.test(trimmed)) {
    return { error: `Escribe una cantidad con hasta ${QUANTITY_DECIMALS} decimales.` }
  }
  const value = Number(trimmed.replace(",", "."))
  if (!(value > 0)) return { error: mode === "tokens" ? "El monto tiene que ser mayor que cero." : "La cantidad tiene que ser mayor que cero." }
  return { value }
}

/**
 * UUID v4 para el clientOrderId. React Native no trae crypto.randomUUID; si no
 * esta, Math.random alcanza: solo tiene que no repetirse entre dos ordenes.
 */
export function uuid(): string {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  if (typeof cryptoApi?.randomUUID === "function") return cryptoApi.randomUUID()
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0
    return (char === "x" ? random : (random & 0x3) | 0x8).toString(16)
  })
}
