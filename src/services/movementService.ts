import { http } from "@/api/client"
import { compactParams } from "@/api/params"
import type { PageParams, PageResponse } from "@/types/api"
import type { Movement, MovementFilters } from "@/types/movements"

/** Ingresos y gastos juntos, solo lectura. Crear, editar y borrar va por sus propios servicios. */
export const movementService = {
  async list(params: PageParams & MovementFilters, signal?: AbortSignal): Promise<PageResponse<Movement>> {
    const { data } = await http.get<PageResponse<Movement>>("/movements", { params: compactParams(params), signal })
    return data
  },
}
