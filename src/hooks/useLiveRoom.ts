import { useCallback, useEffect, useState } from "react"
import { ApiError } from "@/api/errors"
import { streamEvents } from "@/services/eventStream"

export type RoomConnection = "connecting" | "live" | "reconnecting" | "missing"

/**
 * Una sala en vivo: escucha el SSE de la sala y reconecta si se corta (cada vez
 * esperando un poco mas, hasta 15 s). `apply` mezcla tambien lo que devuelven
 * las acciones (entrar, votar…), para no esperar al siguiente evento.
 */
export function useLiveRoom<T>(path: string) {
  const [view, setView] = useState<T | null>(null)
  const [connection, setConnection] = useState<RoomConnection>("connecting")

  const apply = useCallback((next: T) => setView(next), [])

  useEffect(() => {
    const controller = new AbortController()
    let attempt = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const connect = () => {
      streamEvents(
        path,
        ({ data }) => {
          attempt = 0
          setConnection("live")
          setView(JSON.parse(data) as T)
        },
        controller.signal,
      )
        .then(() => {
          if (controller.signal.aborted) return
          setConnection("reconnecting")
          timer = setTimeout(connect, 2_000)
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return
          // Una sala cancelada o vencida ya no existe: no tiene sentido reintentar.
          if (error instanceof ApiError && error.status === 404) {
            setConnection("missing")
            return
          }
          setConnection("reconnecting")
          timer = setTimeout(connect, Math.min(15_000, 2_000 * 2 ** attempt++))
        })
    }
    connect()

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [path])

  return { view, connection, apply }
}
