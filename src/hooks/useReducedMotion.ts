import { useEffect, useState } from "react"
import { AccessibilityInfo } from "react-native"

/**
 * Si la persona activo "Reducir movimiento" en el celular. Escucha los cambios:
 * si la activa con la app abierta, se aplica al instante. Las animaciones de
 * Reanimated (hojas, ZoomIn, FadeIn) ya la respetan solas; esto es para las de Animated.
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    let alive = true
    // Si el sistema no responde, se queda con las animaciones: es lo que la app hacia antes.
    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled())
      .then((value) => {
        if (alive) setReduced(Boolean(value))
      })
      .catch(() => {})
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced)
    return () => {
      alive = false
      subscription?.remove()
    }
  }, [])
  return reduced
}
