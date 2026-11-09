import { Platform } from "react-native"
import * as Haptics from "expo-haptics"

/**
 * La vibracion corta que confirma con el cuerpo lo que paso en pantalla. En web
 * no hay, y si el celular la tiene apagada o falla, se sigue sin ella.
 */
function run(effect: () => Promise<void>) {
  if (Platform.OS === "web") return
  effect().catch(() => {})
}

export const haptics = {
  /** Algo salio bien: una orden ejecutada, una meta cumplida, la app desbloqueada. */
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Algo no se pudo: una orden rechazada. */
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** Se eligio otra opcion en un selector. */
  selection: () => run(() => Haptics.selectionAsync()),
}
