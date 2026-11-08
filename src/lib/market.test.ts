import { returnsByRange, yearStats } from "@/lib/assetStats"
import { formatSignedPercent, formatSignedTokens, parseOrderValue, quantityToTokens, tokensToQuantity, unitOf } from "@/lib/market"
import { groupByDay, inPeriod, matchesKind, orderMetrics, receiptText } from "@/lib/orders"
import { portfolioHistory } from "@/lib/portfolioHistory"
import type { PricePoint, TradeOrder } from "@/types/market"

const order = (over: Partial<TradeOrder>): TradeOrder => ({
  id: 1, assetId: 1, symbol: "VOO", side: "BUY", quantity: 1, status: "EXECUTED", executionPrice: 474,
  tokensMoved: 474, tokenRate: 1, rejectionReason: null, createdAt: "2026-11-03T15:00:00", executedAt: "2026-11-03T15:00:00", ...over,
})

// Al mediodia UTC, la fecha local es la misma en Lima y en el CI.
const daily = (from: string, prices: number[]): PricePoint[] =>
  prices.map((closePrice, i) => {
    const date = new Date(`${from}T12:00:00Z`)
    date.setUTCDate(date.getUTCDate() + i)
    return { date: date.toISOString().slice(0, 10), closePrice }
  })

describe("formato y cantidades", () => {
  it("usa el signo menos tipografico y la palabra fichas", () => {
    expect(formatSignedTokens(-6.09)).toBe("−6.09 fichas")
    expect(formatSignedPercent(4.4)).toBe("+4.40 %")
  })

  it("con fichas se trunca la cantidad para no gastar de mas, y vuelve a fichas como el backend", () => {
    expect(tokensToQuantity(100, 512.4)).toBe(0.195160)
    expect(quantityToTokens(0.19516, 512.4)).toBe(100)
  })

  it("la cripto se cuenta en su moneda y lo demas en acciones", () => {
    expect(unitOf("BTC-USD", "CRYPTO")).toBe("BTC")
    expect(unitOf("AAPL", "STOCK", 1)).toBe("acción")
  })

  it("el campo de la orden acepta coma y respeta los decimales de cada modo", () => {
    expect(parseOrderValue("25,5", "tokens")).toEqual({ value: 25.5 })
    expect(parseOrderValue("1.234", "tokens")).toEqual({ error: "Escribe un monto con hasta 2 decimales, como 25.50." })
    expect(parseOrderValue("0.000001", "quantity")).toEqual({ value: 0.000001 })
    expect(parseOrderValue("0", "quantity")).toEqual({ error: "La cantidad tiene que ser mayor que cero." })
  })
})

describe("historia de 30 dias", () => {
  it("repite las ordenes con costo promedio y el ultimo dia es lo que dice el backend", () => {
    const orders = [
      order({ id: 1, side: "BUY", quantity: 2, tokensMoved: 200, createdAt: "2026-11-01T15:00:00", executedAt: "2026-11-01T15:00:00" }),
      order({ id: 2, side: "SELL", quantity: 1, tokensMoved: 130, createdAt: "2026-11-02T15:00:00", executedAt: "2026-11-02T15:00:00" }),
    ]
    const closes = new Map([[1, daily("2026-11-01", [110, 120, 125])]])
    const now = { value: 1, unrealized: 2, realized: 3 }
    const days = portfolioHistory(["2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03"], orders, closes, now)

    expect(days[0]).toEqual({ date: "2026-10-31", value: 0, unrealized: 0, realized: 0 })
    expect(days[1]).toEqual({ date: "2026-11-01", value: 220, unrealized: 20, realized: 0 })
    // Vendio 1 de 2 a 130 con costo promedio 100: gano 30 realizados y le queda 1.
    expect(days[2]).toEqual({ date: "2026-11-02", value: 120, unrealized: 20, realized: 30 })
    expect(days[3]).toEqual({ date: "2026-11-03", ...now })
  })
})

describe("ordenes", () => {
  const list = [
    order({ id: 3, createdAt: "2026-11-07T15:00:00" }),
    order({ id: 2, side: "SELL", tokensMoved: 120.5, createdAt: "2026-10-28T15:00:00" }),
    order({ id: 1, status: "REJECTED", executionPrice: null, tokensMoved: 0, rejectionReason: "No te alcanzan las fichas.", createdAt: "2026-09-01T15:00:00" }),
  ]

  it("filtra por periodo y tipo; una rechazada no cuenta como compra", () => {
    expect(inPeriod(list, "7d", "2026-11-07").map((o) => o.id)).toEqual([3])
    expect(inPeriod(list, "30d", "2026-11-07").map((o) => o.id)).toEqual([3, 2])
    expect(list.filter((o) => matchesKind(o, "compras")).map((o) => o.id)).toEqual([3])
  })

  it("las cifras del periodo separan lo invertido, lo recibido y lo rechazado", () => {
    const [executed, invested, received, rejected] = orderMetrics(list, "todo", "2026-11-07")
    expect([executed.value, invested.value, received.value, rejected.value]).toEqual([2, 474, 120.5, 1])
    expect(executed.bars.reduce((a, b) => a + b, 0)).toBe(2)
  })

  it("agrupa por dia con el neto de fichas; un dia solo con rechazadas no tiene neto", () => {
    expect(groupByDay(list).map((d) => [d.day, d.net])).toEqual([["2026-11-07", -474], ["2026-10-28", 120.5], ["2026-09-01", null]])
  })

  it("el comprobante en texto lleva el numero y el motivo del rechazo", () => {
    const text = receiptText(list[2], "Vanguard S&P 500 ETF")
    expect(text.split("\n")[0]).toBe("Cash-Out · Orden N.º 000001")
    expect(text).toContain("Compra de VOO (Vanguard S&P 500 ETF)")
    expect(text.endsWith("No te alcanzan las fichas.")).toBe(true)
  })
})

describe("estadisticas del activo", () => {
  it("un rango sin historia completa queda vacio, pero 5A y Máx usan lo que hay", () => {
    // 45 cierres seguidos: del 20 sep (100) al 3 nov (144). El mes va del 3 oct (113) al 3 nov.
    const points = daily("2026-09-20", Array.from({ length: 45 }, (_, i) => 100 + i))
    const byRange = Object.fromEntries(returnsByRange(points).map((r) => [r.range, r.value]))
    expect(byRange["1M"]).toBeCloseTo(((144 - 113) / 113) * 100)
    expect(byRange["1A"]).toBeNull()
    expect(byRange.MAX).toBeCloseTo(44)
  })

  it("52 semanas: minimo, maximo, peor caida y distancia al maximo", () => {
    const stats = yearStats(daily("2026-10-01", [100, 120, 90, 108]))!
    expect([stats.low, stats.high]).toEqual([90, 120])
    expect(stats.maxDrawdown).toBeCloseTo(-25)
    expect(stats.fromHigh).toBeCloseTo(-10)
    // Con menos de 20 retornos no se estima la volatilidad.
    expect(stats.volatility).toBeNull()
  })
})
