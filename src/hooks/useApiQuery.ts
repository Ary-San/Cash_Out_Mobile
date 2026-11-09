import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { toApiError, type ApiError } from "@/api/errors"
import { onReconnect } from "@/lib/network"

/** Si falla por la red o el servidor, se reintenta solo tras estas esperas; despues, al volver la red. */
export const RETRY_DELAYS_MS = [2_000, 5_000, 15_000]

export interface ApiQuery<T> {
  data: T | undefined
  error: ApiError | undefined
  isLoading: boolean
  /** Recargando con datos previos en pantalla. */
  isRefreshing: boolean
  reload(): void
}

interface Settled<T> {
  request: string
  data?: T
  error?: ApiError
}

export function useApiQuery<T>(
  key: readonly unknown[],
  fetcher: (signal: AbortSignal) => Promise<T>,
): ApiQuery<T> {
  const [nonce, setNonce] = useState(0)
  const [settled, setSettled] = useState<Settled<T>>()

  const request = JSON.stringify([key, nonce])

  const attempts = useRef(0)
  const fetcherRef = useRef(fetcher)
  useLayoutEffect(() => {
    fetcherRef.current = fetcher
  })

  useEffect(() => {
    const controller = new AbortController()

    fetcherRef
      .current(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        attempts.current = 0
        setSettled({ request, data })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const error = toApiError(err)
        if (!error.isCanceled) setSettled((previous) => ({ request, data: previous?.data, error }))
      })

    return () => controller.abort()
  }, [request])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  const isCurrent = settled?.request === request
  const error = isCurrent ? settled?.error : undefined

  // Reintento solo, con esperas cada vez mas largas. Un 4xx no se reintenta: volveria a fallar igual.
  useEffect(() => {
    const attempt = attempts.current
    if (!error?.retryable || attempt >= RETRY_DELAYS_MS.length) return
    const timer = setTimeout(() => {
      attempts.current = attempt + 1
      reload()
    }, RETRY_DELAYS_MS[attempt])
    return () => clearTimeout(timer)
  }, [error, reload])

  // Al volver la red se carga de nuevo aunque ya se hayan gastado los reintentos.
  const failed = Boolean(error?.retryable)
  useEffect(() => {
    if (!failed) return
    return onReconnect(() => {
      attempts.current = 0
      reload()
    })
  }, [failed, reload])

  return {
    data: settled?.data,
    error,
    isLoading: !isCurrent && settled === undefined,
    isRefreshing: !isCurrent && settled !== undefined,
    reload,
  }
}
