/** SavingsResponse: el saldo lo calcula el backend; la app solo lo muestra. */
export interface Savings {
  id: number
  currentBalance: number
  /** Apartado para metas en curso; ya esta dentro de currentBalance. */
  committedAmount: number
  availableBalance: number
  updatedAt: string
}

/** TokenWalletResponse: las fichas del simulador, que no son dinero. */
export interface TokenWallet {
  id: number
  tokenBalance: number
  updatedAt: string
}
