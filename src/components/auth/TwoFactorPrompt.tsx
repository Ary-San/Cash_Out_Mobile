import { use, useCallback, useState, type ReactNode } from "react"
import { View } from "react-native"
import { AuthContext } from "@/contexts/authContext"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { Sheet } from "@/components/ui/Sheet"
import { Text } from "@/components/ui/Text"

/**
 * Pide el codigo de la app autenticadora antes de crear un acceso que sobrevive a
 * las sesiones (vincular WhatsApp, crear el atajo, conectar Gmail). Solo si la
 * cuenta tiene verificacion en dos pasos; si no, no pregunta nada.
 *
 * ask() devuelve el codigo, undefined si no hacia falta, o null si se cancelo.
 */
export function useTwoFactorPrompt(): { ask: (action: string) => Promise<string | null | undefined>; sheet: ReactNode } {
  // Sin el proveedor (en pruebas de una pantalla suelta) se comporta como una cuenta sin 2FA.
  const enabled = !!use(AuthContext)?.user?.twoFactorEnabled
  const [pending, setPending] = useState<{ action: string; resolve: (code: string | null) => void } | null>(null)
  const [code, setCode] = useState("")

  const ask = useCallback(
    (action: string) => (enabled ? new Promise<string | null>((resolve) => setPending({ action, resolve })) : Promise.resolve(undefined)),
    [enabled],
  )
  const finish = (value: string | null) => {
    pending?.resolve(value)
    setPending(null)
    setCode("")
  }

  const sheet = (
    <Sheet visible={pending !== null} onClose={() => finish(null)} title="Confirma con tu código">
      <View className="gap-3.5">
        <Text className="text-sm leading-5">
          Para {pending?.action}, escribe el código de tu app autenticadora (o uno de recuperación). Así nadie con tu sesión prestada puede dejar un acceso abierto.
        </Text>
        <Field
          label="Código"
          value={code}
          onChangeText={setCode}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          autoCapitalize="characters"
          maxLength={13}
          returnKeyType="done"
          onSubmitEditing={() => code.trim() && finish(code.trim())}
        />
        <View className="flex-row gap-2.5">
          <View className="flex-1"><Button label="Cancelar" variant="outline" onPress={() => finish(null)} /></View>
          <View className="flex-1"><Button label="Confirmar" disabled={!code.trim()} onPress={() => finish(code.trim())} /></View>
        </View>
      </View>
    </Sheet>
  )

  return { ask, sheet }
}
