import { Alert, Platform } from "react-native"

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  /** Lo pinta en rojo en iOS: borrar, desconectar, revocar. */
  destructive?: boolean
}

/**
 * Pregunta con el dialogo del sistema y resuelve true si se confirma. En la vista
 * web Alert.alert no hace nada, asi que ahi se usa window.confirm.
 */
export function confirmAction({ title, message, confirmLabel, cancelLabel = "Cancelar", destructive = false }: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`))
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
        { text: confirmLabel, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    )
  })
}
