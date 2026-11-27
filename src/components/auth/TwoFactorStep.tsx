import { useState } from "react"
import { Pressable, View } from "react-native"
import { toApiError, userMessage } from "@/api/errors"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { Notice } from "@/components/ui/Notice"
import { Text, Title } from "@/components/ui/Text"
import { useAuth } from "@/hooks/useAuth"

/**
 * El segundo paso del inicio de sesion: la contrasena ya paso, falta el codigo de
 * la app autenticadora. Acepta tambien un codigo de recuperacion, para quien
 * perdio el celular. Cinco codigos incorrectos y hay que volver a empezar.
 */
export function TwoFactorStep() {
  const { completeTwoFactor, cancelTwoFactor } = useAuth()
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submit = async () => {
    if (!code.trim()) {
      setError("Escribe el código de tu app autenticadora.")
      return
    }
    setPending(true)
    setError(null)
    try {
      // Stack.Protected cambia a la pantalla principal al abrirse la sesion.
      await completeTwoFactor(code.trim())
    } catch (err) {
      const apiError = toApiError(err)
      setError(apiError.status === 401 ? (apiError.serverMessage ?? "El código no es correcto.") : userMessage(apiError))
      setCode("")
      setPending(false)
    }
  }

  return (
    <View className="gap-7">
      <View className="gap-2">
        <Title size="xl">Un paso más</Title>
        <Text tone="muted" className="text-base">
          Tu cuenta tiene verificación en dos pasos. Escribe el código de 6 dígitos de tu app autenticadora.
        </Text>
      </View>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Field
        label="Código"
        value={code}
        onChangeText={setCode}
        placeholder="123456"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={13}
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
        autoFocus
      />
      <Text tone="muted" className="-mt-4 text-xs leading-4">
        ¿Sin tu celular? Escribe uno de tus códigos de recuperación (XXXXX-XXXXX). Cada uno sirve una vez.
      </Text>
      <Button label={pending ? "Verificando…" : "Verificar y entrar"} loading={pending} onPress={() => void submit()} />
      <Pressable role="button" disabled={pending} onPress={cancelTwoFactor} className="min-h-11 items-center justify-center">
        <Text tone="muted" className="text-sm">Volver a iniciar sesión</Text>
      </Pressable>
    </View>
  )
}
