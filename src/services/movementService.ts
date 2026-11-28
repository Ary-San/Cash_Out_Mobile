import { http } from "@/api/client"
import { compactParams } from "@/api/params"
import { monthRange } from "@/lib/monthPace"
import type { PageParams, PageResponse } from "@/types/api"
import type { MonthReport } from "@/types/budgets"
import type { Movement, MovementFilters } from "@/types/movements"

/** Ingresos y gastos juntos, solo lectura. Crear, editar y borrar va por sus propios servicios. */
const MONTH_PAGE = 500
const MONTH_MAX_PAGES = 10

export const movementService = {
  /** Todos los movimientos de un mes (yyyy-MM), en paginas grandes. */
  async month(month: string, signal?: AbortSignal): Promise<Movement[]> {
    const range = monthRange(month)
    const movements: Movement[] = []
    for (let page = 0; page < MONTH_MAX_PAGES; page++) {
      const data = await movementService.list({ ...range, page, size: MONTH_PAGE, sort: "date,desc" }, signal)
      movements.push(...data.content)
      if (page + 1 >= data.totalPages) break
    }
    return movements
  },

  /** El resumen del mes para el PDF. */
  async report(month: string, signal?: AbortSignal): Promise<MonthReport> {
    const { data } = await http.get<MonthReport>("/movements/report", { params: { month }, signal })
    return data
  },

  /** El CSV del mes como texto (ya trae la marca UTF-8 para que Excel lea las tildes). */
  async exportCsv(month: string): Promise<string> {
    const { data } = await http.get<string>("/movements/export", { params: { month }, responseType: "text" })
    return data
  },

  async list(params: PageParams & MovementFilters, signal?: AbortSignal): Promise<PageResponse<Movement>> {
    const { data } = await http.get<PageResponse<Movement>>("/movements", { params: compactParams(params), signal })
    return data
  },
}
