import { http } from "@/api/client"
import { compactParams } from "@/api/params"
import type { PageParams, PageResponse } from "@/types/api"
import type { Asset, AssetQuote, AssetType, PricePoint } from "@/types/market"

/** Catalogo, cotizaciones e historico. El backend los trae de Alpaca y Coinbase. */
export const marketService = {
  async searchAssets(
    params: PageParams & { search?: string; type?: AssetType },
    signal?: AbortSignal,
  ): Promise<PageResponse<Asset>> {
    const { data } = await http.get<PageResponse<Asset>>("/assets", { params: compactParams(params), signal })
    return data
  },

  /** Varias cotizaciones en un pedido; las que no tienen precio no vienen. */
  async quotes(ids: number[], signal?: AbortSignal): Promise<AssetQuote[]> {
    if (ids.length === 0) return []
    const { data } = await http.get<AssetQuote[]>("/assets/quotes", { params: { ids: ids.join(",") }, signal })
    return data
  },

  async getAsset(id: number, signal?: AbortSignal): Promise<Asset> {
    const { data } = await http.get<Asset>(`/assets/${id}`, { signal })
    return data
  },

  async getQuote(id: number, signal?: AbortSignal): Promise<AssetQuote> {
    const { data } = await http.get<AssetQuote>(`/assets/${id}/quote`, { signal })
    return data
  },

  /** Cierres diarios, del mas antiguo al mas reciente. Sin fechas, todo lo guardado. */
  async getPriceHistory(id: number, signal?: AbortSignal, range?: { from: string; to: string }): Promise<PricePoint[]> {
    const { data } = await http.get<PricePoint[]>(`/assets/${id}/price-history`, { params: range, signal })
    return data
  },
}
