import type { ExpenseCategory } from "@/types/movements"

export type SplitMode = "EQUAL" | "AMOUNT" | "PERCENT"

/** Una persona de la cuenta (de fuera de la app). */
export interface SplitPart {
  id: number
  name: string
  /** Solo digitos con codigo de pais (51...). */
  phone: string | null
  share: number
  /** Pago la cuenta, cuando no fui yo. */
  payer: boolean
  status: "PENDING" | "PAID"
  paidAt: string | null
  /** El link de WhatsApp con el recordatorio listo; null sin telefono o si ya pago. */
  reminderUrl: string | null
}

/** GET /split-bills: una cuenta compartida. */
export interface SplitBill {
  id: number
  title: string
  category: ExpenseCategory
  categoryName: string
  total: number
  myShare: number
  paidByMe: boolean
  date: string
  expenseId: number | null
  /** Pago otro y ya le devolvi mi parte. */
  settled: boolean
  /** Lo que falta: lo que me deben (pague yo) o lo que debo (pago otro). */
  pending: number
  parts: SplitPart[]
}

/** GET /split-bills/balances: lo que hay con una persona. net > 0, me debe; net < 0, le debo. */
export interface SplitBalance {
  name: string
  phone: string | null
  owesMe: number
  iOwe: number
  net: number
  bills: number
  reminderUrl: string | null
}

export interface SplitPersonRequest {
  name: string
  phone?: string
  amount?: number
  percent?: number
}

export interface SplitBillRequest {
  title?: string
  category?: ExpenseCategory
  total?: number
  date?: string
  paidByMe: boolean
  payerIndex?: number
  mode: SplitMode
  includeMe: boolean
  people: SplitPersonRequest[]
  /** Dividir un gasto ya anotado: total, categoria y fecha salen de el. */
  expenseId?: number
}

/** GET /split-bills/hint: cuantos son (contandome) y los nombres, sacados de la frase. */
export interface SplitHint {
  people: number | null
  names: string[]
}
