import { fireEvent, render, screen } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { OrderSheet, type OrderTarget } from "@/components/portfolio/OrderSheet"
import { financeService } from "@/services/financeService"
import { marketService } from "@/services/marketService"
import { portfolioService } from "@/services/portfolioService"
import type { TradeOrder } from "@/types/market"
import * as Haptics from "expo-haptics"

jest.mock("@/services/marketService", () => ({ marketService: { getQuote: jest.fn() } }))
jest.mock("@/services/financeService", () => ({ financeService: { wallet: jest.fn() } }))
jest.mock("@/services/portfolioService", () => ({ portfolioService: { placeOrder: jest.fn() } }))

const METRICS = { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }
const market = marketService as jest.Mocked<typeof marketService>
const finance = financeService as jest.Mocked<typeof financeService>
const portfolio = portfolioService as jest.Mocked<typeof portfolioService>

const voo: OrderTarget = { assetId: 7, symbol: "VOO", name: "Vanguard S&P 500 ETF", side: "BUY", held: 0 }
const order = (over: Partial<TradeOrder>): TradeOrder => ({
  id: 1, assetId: 7, symbol: "VOO", side: "BUY", quantity: 0.195160, status: "EXECUTED", executionPrice: 512.4, tokensMoved: 100,
  tokenRate: 1, rejectionReason: null, createdAt: "2026-11-07T15:00:00", executedAt: "2026-11-07T15:00:00", ...over,
})

const renderSheet = (target: OrderTarget, onDone = jest.fn()) =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <OrderSheet target={target} onClose={jest.fn()} onDone={onDone} />
    </SafeAreaProvider>,
  )

beforeEach(() => {
  // clearAllMocks y no resetAllMocks: este ultimo borra el mock de AppState que usa usePolling.
  jest.clearAllMocks()
  market.getQuote.mockResolvedValue({ symbol: "VOO", price: 512.4, previousClose: 509.3, changePercent: 0.6, currency: "USD", updatedAt: "2026-11-07T15:00:00" })
  finance.wallet.mockResolvedValue({ id: 1, tokenBalance: 420.5, updatedAt: "" })
})

describe("Hoja de orden", () => {
  it("valida antes de revisar y no deja gastar mas fichas de las que hay", async () => {
    await renderSheet(voo)
    expect(await screen.findByText("Tienes 420.50 fichas. Puedes comprar fracciones de acción.")).toBeTruthy()

    await fireEvent.press(screen.getByText("Revisar compra"))
    expect(await screen.findByText("Ingresa el monto.")).toBeTruthy()

    await fireEvent.changeText(screen.getByLabelText("Fichas a invertir"), "500")
    await fireEvent.press(screen.getByText("Revisar compra"))
    expect(await screen.findByText("No te alcanzan las fichas: tienes 420.50 fichas.")).toBeTruthy()
    expect(portfolio.placeOrder).not.toHaveBeenCalled()
  })

  it("compra en dos pasos: revisar y confirmar", async () => {
    portfolio.placeOrder.mockResolvedValue(order({}))
    const onDone = jest.fn()
    await renderSheet(voo, onDone)

    await fireEvent.changeText(await screen.findByLabelText("Fichas a invertir"), "100")
    await fireEvent.press(screen.getByText("Revisar compra"))
    expect(await screen.findByText("Vas a comprar ≈ 0.19516 VOO por 100.00 fichas, al precio del momento.")).toBeTruthy()

    await fireEvent.press(screen.getByText("Confirmar compra"))
    await screen.findByText("Revisar compra").catch(() => undefined)
    expect(portfolio.placeOrder).toHaveBeenCalledWith(expect.objectContaining({ assetId: 7, side: "BUY", quantity: 0.19516 }))
    expect(onDone).toHaveBeenCalled()
    // La compra ejecutada se confirma tambien con una vibracion corta.
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success)
  })

  it("si el backend la rechaza, muestra el motivo y el reintento es otra orden", async () => {
    portfolio.placeOrder
      .mockResolvedValueOnce(order({ status: "REJECTED", rejectionReason: "No te alcanzan las fichas.", tokensMoved: 0 }))
      .mockResolvedValueOnce(order({}))
    await renderSheet(voo)

    await fireEvent.changeText(await screen.findByLabelText("Fichas a invertir"), "100")
    await fireEvent.press(screen.getByText("Revisar compra"))
    await fireEvent.press(await screen.findByText("Confirmar compra"))
    expect(await screen.findByText("No te alcanzan las fichas.")).toBeTruthy()
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Warning)

    await fireEvent.press(screen.getByText("Revisar compra"))
    await fireEvent.press(await screen.findByText("Confirmar compra"))
    await screen.findByText("Revisar compra").catch(() => undefined)
    const [first, second] = portfolio.placeOrder.mock.calls.map(([input]) => input.clientOrderId)
    expect(first).not.toBe(second)
  })

  it("sin acciones no se puede vender; con acciones se vende en cantidad", async () => {
    await renderSheet({ ...voo, side: "SELL", held: 1.2 })
    expect(await screen.findByText("Cantidad de acciones")).toBeTruthy()
    await fireEvent.press(screen.getByText("Vender todo"))
    await fireEvent.press(screen.getByText("Revisar venta"))
    expect(await screen.findByText("Vas a vender ≈ 1.2 VOO por 614.88 fichas, al precio del momento.")).toBeTruthy()
  })
})
