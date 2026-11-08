import { useState } from "react"
import { View } from "react-native"
import { userMessage, toApiError } from "@/api/errors"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { Notice } from "@/components/ui/Notice"
import { Sheet } from "@/components/ui/Sheet"
import { Text } from "@/components/ui/Text"
import { useToast } from "@/components/ui/Toast"
import { useAuth } from "@/hooks/useAuth"
import { DELETE_WORD } from "@/lib/profile"
import { userService } from "@/services/userService"

/**
 * Eliminar la cuenta: borra todo en el backend y cierra la sesion. Pide escribir
 * ELIMINAR para que no pase por un toque sin querer.
 */
export function DeleteAccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const toast = useToast()
  const { logout } = useAuth()
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const ready = text.trim().toUpperCase() === DELETE_WORD

  const close = () => {
    setText("")
    setError(undefined)
    onClose()
  }

  const remove = async () => {
    setBusy(true)
    setError(undefined)
    try {
      await userService.deleteMe()
      toast("Eliminamos tu cuenta y todos tus datos.")
      // La sesion ya no existe en el backend: se limpia la de este celular.
      await logout()
    } catch (err) {
      setError(userMessage(toApiError(err)))
      setBusy(false)
    }
  }

  return (
    <Sheet visible={visible} onClose={close} locked={busy} title="¿Eliminar tu cuenta?">
      <View className="gap-3.5">
        <Text className="text-sm leading-5">
          Se borran tu cuenta y todos tus datos: movimientos, metas, ahorro, fichas, portafolio y la conexión con Gmail. Después puedes registrarte de nuevo con este correo, desde cero.
        </Text>
        <Text tone="muted" className="text-[13px] leading-5">Si solo quieres salir, usa «Cerrar sesión».</Text>
        <Field
          label={`Escribe ${DELETE_WORD} para confirmar`}
          value={text}
          onChangeText={setText}
          autoCapitalize="characters"
          autoComplete="off"
        />
        <Text tone="muted" className="-mt-2 text-xs">{ready ? "Listo: el botón Eliminar ya está activo." : "Así evitamos que la borres por error."}</Text>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <View className="flex-row gap-2.5">
          <View className="flex-1"><Button label="Cancelar" variant="outline" disabled={busy} onPress={close} /></View>
          <View className="flex-1"><Button label="Eliminar" variant="destructive" disabled={!ready} loading={busy} onPress={() => void remove()} /></View>
        </View>
      </View>
    </Sheet>
  )
}
