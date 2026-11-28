import { http } from "@/api/client"
import type { SplitBalance, SplitBill, SplitBillRequest, SplitHint } from "@/types/splits"

/** Las cuentas compartidas con personas de fuera de la app. */
export const splitService = {
  async list(signal?: AbortSignal): Promise<SplitBill[]> {
    const { data } = await http.get<SplitBill[]>("/split-bills", { signal })
    return data
  },

  async balances(signal?: AbortSignal): Promise<SplitBalance[]> {
    const { data } = await http.get<SplitBalance[]>("/split-bills/balances", { signal })
    return data
  },

  async hint(text: string): Promise<SplitHint> {
    const { data } = await http.get<SplitHint>("/split-bills/hint", { params: { text } })
    return data
  },

  async create(request: SplitBillRequest): Promise<SplitBill> {
    const { data } = await http.post<SplitBill>("/split-bills", request)
    return data
  },

  /** "Me pagó" (paid) o deshacerlo. */
  async setPaid(billId: number, partId: number, paid: boolean): Promise<SplitBill> {
    const url = `/split-bills/${billId}/parts/${partId}/paid`
    const { data } = paid ? await http.post<SplitBill>(url) : await http.delete<SplitBill>(url)
    return data
  },

  /** "Ya le pagué mi parte" (cuando pagó otro) o deshacerlo. */
  async setSettled(billId: number, settled: boolean): Promise<SplitBill> {
    const url = `/split-bills/${billId}/settle`
    const { data } = settled ? await http.post<SplitBill>(url) : await http.delete<SplitBill>(url)
    return data
  },

  async remove(billId: number): Promise<void> {
    await http.delete(`/split-bills/${billId}`)
  },
}
