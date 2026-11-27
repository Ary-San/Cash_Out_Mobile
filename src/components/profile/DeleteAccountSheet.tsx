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
import { confirmWithBiometrics } from "@/lib/biometrics"
import { DELETE_WORD } from "@/lib/profile"
import { userService } from "@/services/userService"

/**
 * Eliminar la cuenta: borra todo en el backend y cierra la sesion. Pide escribir
 * ELIMINAR para que no pase por un toque sin querer, y la contrasena, que el
 * backend exige: con solo la sesion, un celular prestado bastaria para borrarlo todo.
 * Una cuenta creada con Google no tiene contrasena, y la app todavia no entra con
 * Google: esa se elimina desde la web.
 */
export function DeleteAccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const toast = useToast()
  const { user, logout } = useAuth()
  const googleOnly = user?.googleOnly ?? false
  const [text, setText] = useState("")
  const [password, setPassword] = useState("")
  // Con verificacion en dos pasos, tambien el codigo de la app.
  const twoFactor = !!user?.twoFactorEnabled
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const ready = text.trim().toUpperCase() === DELETE_WORD

  const close = () => {
    setText("")
    setPassword("")
    setCode("")
    setError(undefined)
    onClose()
  }

  const remove = async () => {
    if (!(await confirmWithBiometrics("Confirma que quieres eliminar tu cuenta"))) return
    setBusy(true)
    setError(undefined)
    try {
      await userService.deleteMe({ password, twoFactorCode: twoFactor ? code.trim() : undefined })
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
        <Text tone="muted" className="-mt-2 text-xs">{ready ? "Listo: ahora confirma con tu contraseña." : "Así evitamos que la borres por error."}</Text>
        {googleOnly ? (
          <Notice tone="info">Tu cuenta entra con Google y no tiene contraseña. Elimínala desde la web, en Perfil: ahí te pide confirmar con tu cuenta de Google.</Notice>
        ) : (
          <Field label="Tu contraseña" value={password} onChangeText={setPassword} secureToggle autoComplete="current-password" autoCapitalize="none" />
        )}
        {twoFactor && !googleOnly ? (
          <Field label="Código de tu app autenticadora" value={code} onChangeText={setCode} autoComplete="one-time-code" textContentType="oneTimeCode" autoCapitalize="characters" maxLength={13} />
        ) : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
        <View className="flex-row gap-2.5">
          <View className="flex-1"><Button label="Cancelar" variant="outline" disabled={busy} onPress={close} /></View>
          <View className="flex-1"><Button label="Eliminar" variant="destructive" disabled={!ready || googleOnly || password.length === 0 || (twoFactor && !code.trim())} loading={busy} onPress={() => void remove()} /></View>
        </View>
      </View>
    </Sheet>
  )
}
