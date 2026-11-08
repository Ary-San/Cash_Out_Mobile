import { useState } from "react"
import { View } from "react-native"
import { router } from "expo-router"
import { Check, Circle } from "lucide-react-native"
import { userMessage, toApiError } from "@/api/errors"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { Notice } from "@/components/ui/Notice"
import { Screen } from "@/components/ui/Screen"
import { Text } from "@/components/ui/Text"
import { useToast } from "@/components/ui/Toast"
import { useAuth } from "@/hooks/useAuth"
import { changePasswordSchema, passwordRules } from "@/lib/validation"
import { userService } from "@/services/userService"
import { usePalette } from "@/theme/palette"

type Key = "currentPassword" | "newPassword" | "confirmPassword"

export default function PasswordScreen() {
  const colors = usePalette()
  const toast = useToast()
  const { user, login, logout } = useAuth()
  const [values, setValues] = useState<Record<Key, string>>({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({})
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<string>()

  const set = (key: Key) => (value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const save = async () => {
    if (!user) return
    const parsed = changePasswordSchema.safeParse(values)
    if (!parsed.success) {
      const next: Partial<Record<Key, string>> = {}
      for (const issue of parsed.error.issues) next[issue.path[0] as Key] ??= issue.message
      setErrors(next)
      return
    }
    setSaving(true)
    setFailure(undefined)
    try {
      await userService.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword })
    } catch (err) {
      const error = toApiError(err)
      // El backend responde 401 a una contraseña actual equivocada; el cliente ya descarto que sea la sesion.
      if (error.status === 401) setErrors({ currentPassword: "La contraseña actual no es correcta." })
      else if (error.fieldErrors.newPassword) setErrors({ newPassword: "La contraseña no cumple todos los requisitos." })
      else setFailure(userMessage(error))
      setSaving(false)
      return
    }
    // El cambio cierra todas las sesiones, tambien esta: se entra de nuevo con la contraseña nueva.
    try {
      await login({ email: user.email, password: values.newPassword })
      toast("Contraseña actualizada: cerramos tu sesión en los demás dispositivos.")
      router.back()
    } catch {
      toast("Contraseña actualizada. Vuelve a entrar con tu contraseña nueva.")
      await logout()
    }
  }

  return (
    <Screen back title="Contraseña" subtitle="Al cambiarla se cierra tu sesión en los demás dispositivos; en este sigues dentro.">
      <Field
        label="Contraseña actual"
        value={values.currentPassword}
        onChangeText={set("currentPassword")}
        secureToggle
        autoComplete="current-password"
        textContentType="password"
        error={errors.currentPassword}
      />
      <Field
        label="Contraseña nueva"
        value={values.newPassword}
        onChangeText={set("newPassword")}
        secureToggle
        autoComplete="new-password"
        textContentType="newPassword"
        error={errors.newPassword}
      />
      <View accessibilityLabel="Requisitos de la contraseña" className="flex-row flex-wrap gap-y-2 rounded-xl bg-muted px-3.5 py-3">
        {passwordRules.map((rule) => {
          const ok = rule.test(values.newPassword)
          return (
            <View key={rule.id} className="w-1/2 flex-row items-start gap-1.5 pr-2" accessibilityLabel={`${rule.label}: ${ok ? "cumplido" : "pendiente"}`}>
              {ok ? <Check size={14} color={colors.gain} /> : <Circle size={14} color={colors.mutedForeground} />}
              <Text tone={ok ? "gain" : "muted"} className="flex-1 text-[12.5px]">{rule.label}</Text>
            </View>
          )
        })}
      </View>
      <Field
        label="Repite la contraseña nueva"
        value={values.confirmPassword}
        onChangeText={set("confirmPassword")}
        secureToggle
        autoComplete="new-password"
        textContentType="newPassword"
        error={errors.confirmPassword}
      />
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <Button label="Cambiar contraseña" loading={saving} onPress={() => void save()} />
    </Screen>
  )
}
