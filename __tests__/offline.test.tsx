import { act, render, renderHook, screen } from "@testing-library/react-native"
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { ApiError } from "@/api/errors"
import { OfflineBanner } from "@/components/ui/OfflineBanner"
import { RETRY_DELAYS_MS, useApiQuery } from "@/hooks/useApiQuery"

const net = NetInfo as jest.Mocked<typeof NetInfo>
const METRICS = { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }
const offlineError = () => new ApiError({ kind: "network" })

let listeners: ((state: Partial<NetInfoState>) => void)[] = []
const emit = (isConnected: boolean) => act(() => listeners.forEach((listener) => listener({ isConnected, isInternetReachable: isConnected })))

beforeEach(() => {
  jest.useFakeTimers()
  listeners = []
  net.addEventListener.mockImplementation((listener) => {
    listeners.push(listener as (state: Partial<NetInfoState>) => void)
    return () => (listeners = listeners.filter((l) => l !== listener))
  })
})
afterEach(() => jest.useRealTimers())

describe("sin conexion", () => {
  it("si falla la red reintenta solo y se queda con el dato cuando vuelve a responder", async () => {
    const fetcher = jest.fn().mockRejectedValueOnce(offlineError()).mockResolvedValue("ok")
    const { result } = await renderHook(() => useApiQuery(["saldo"], fetcher))
    expect(result.current.error?.kind).toBe("network")

    await act(async () => jest.advanceTimersByTime(RETRY_DELAYS_MS[0]))
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(result.current.data).toBe("ok")
    expect(result.current.error).toBeUndefined()
  })

  it("un error del usuario (4xx) no se reintenta", async () => {
    const fetcher = jest.fn().mockRejectedValue(new ApiError({ kind: "http", status: 404 }))
    await renderHook(() => useApiQuery(["meta"], fetcher))
    await act(async () => jest.advanceTimersByTime(60_000))
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it("gastados los reintentos, carga de nuevo apenas vuelve la red", async () => {
    const fetcher = jest.fn().mockRejectedValue(offlineError())
    const { result } = await renderHook(() => useApiQuery(["movimientos"], fetcher))
    for (const delay of RETRY_DELAYS_MS) await act(async () => jest.advanceTimersByTime(delay))
    expect(fetcher).toHaveBeenCalledTimes(RETRY_DELAYS_MS.length + 1)

    fetcher.mockResolvedValue(["gasto"])
    await emit(false)
    await act(async () => emit(true))
    expect(result.current.data).toEqual(["gasto"])
  })

  it("muestra el aviso solo cuando no hay internet", async () => {
    net.useNetInfo.mockReturnValue({ isConnected: false, isInternetReachable: false } as NetInfoState)
    const view = await render(<SafeAreaProvider initialMetrics={METRICS}><OfflineBanner /></SafeAreaProvider>)
    expect(screen.getByText("Sin conexión · reintentaremos al volver la red")).toBeTruthy()

    net.useNetInfo.mockReturnValue({ isConnected: true, isInternetReachable: true } as NetInfoState)
    await view.rerender(<SafeAreaProvider initialMetrics={METRICS}><OfflineBanner /></SafeAreaProvider>)
    expect(screen.queryByText("Sin conexión · reintentaremos al volver la red")).toBeNull()
  })
})
