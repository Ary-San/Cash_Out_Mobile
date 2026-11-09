import { useCallback, useEffect, useRef, useState } from "react"
import { AppState } from "react-native"
import type { AuthStatus } from "@/contexts/authContext"
import { isBiometricsEnabled } from "@/lib/biometrics"

/** Pasado este tiempo en segundo plano, al volver se pide la huella otra vez. */
const LOCK_AFTER_MS = 2 * 60_000

/**
 * Bloquea la app con biometria cuando hay una sesion guardada: al abrirla
 * (la sesion se restauro sola) y al volver despues de un rato. Recien despues
 * de escribir la contraseña no se bloquea.
 */
export function useAppLock(status: AuthStatus) {
  const [seen, setSeen] = useState(status)
  const [locked, setLocked] = useState(false)
  const leftAt = useRef<number | null>(null)

  // Se ajusta al cambiar el estado de la sesion, durante el render y no en un efecto.
  if (seen !== status) {
    setSeen(status)
    if (status !== "authenticated") setLocked(false)
    else if (seen === "restoring") setLocked(isBiometricsEnabled())
  }

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") leftAt.current = Date.now()
      if (state !== "active" || leftAt.current === null) return
      const away = Date.now() - leftAt.current
      leftAt.current = null
      if (status === "authenticated" && away >= LOCK_AFTER_MS && isBiometricsEnabled()) setLocked(true)
    })
    return () => subscription.remove()
  }, [status])

  // Estable: la pantalla de bloqueo pide la huella de nuevo si esta funcion cambia.
  const unlock = useCallback(() => setLocked(false), [])
  return { locked, unlock }
}
