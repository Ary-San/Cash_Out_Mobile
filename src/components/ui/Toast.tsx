import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Text } from "@/components/ui/Text"

const DURATION = 2500

const ToastContext = createContext<(message: string) => void>(() => {})

/** Un aviso corto abajo de la pantalla al terminar una accion: "Gasto guardado". */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<{ text: string; id: number } | null>(null)
  const insets = useSafeAreaInsets()

  const show = useCallback((text: string) => setMessage({ text, id: Date.now() }), [])

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(null), DURATION)
    return () => clearTimeout(timer)
  }, [message])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {message ? (
        <View
          pointerEvents="none"
          className="absolute inset-x-5 items-center"
          style={{ bottom: insets.bottom + 72 }}
        >
          <View role="status" aria-live="polite" className="rounded-2xl bg-foreground px-5 py-3">
            <Text weight="medium" tone="inverse" className="text-sm">{message.text}</Text>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  )
}

export function useToast(): (message: string) => void {
  return useContext(ToastContext)
}
