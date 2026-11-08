import { http } from "@/api/client"
import type { Savings, TokenWallet } from "@/types/finance"

/** El saldo y las fichas: lo calcula el backend, la app solo lo muestra. */
export const financeService = {
  async savings(signal?: AbortSignal): Promise<Savings> {
    const { data } = await http.get<Savings>("/savings", { signal })
    return data
  },

  async wallet(signal?: AbortSignal): Promise<TokenWallet> {
    const { data } = await http.get<TokenWallet>("/token-wallet", { signal })
    return data
  },
}
