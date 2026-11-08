import { useState } from "react"
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native"
import { router } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toApiError, userMessage } from "@/api/errors"
import type { SessionEndReason } from "@/api/tokenStore"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { Notice } from "@/components/ui/Notice"
import { Text, Title } from "@/components/ui/Text"
import { useAuth } from "@/hooks/useAuth"
import { applyServerFieldErrors } from "@/lib/formErrors"
import { loginSchema, type LoginValues } from "@/lib/validation"

const END_REASON_MESSAGES: Record<SessionEndReason, string> = {
  logout: "Cerraste sesión. ¡Hasta pronto!",
  expired: "Tu sesión expiró. Inicia sesión de nuevo para continuar donde estabas.",
}

export default function LoginScreen() {
  const { login, endReason } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })
  const { isSubmitting, errors } = form.formState

  const onSubmit = async (values: LoginValues) => {
    setFormError(null)
    try {
      // Stack.Protected cambia a la pantalla principal al abrirse la sesion.
      await login(values)
    } catch (err) {
      const error = toApiError(err)
      if (error.status === 401) {
        // El backend no distingue correo de contrasena para no revelar que correos existen.
        setFormError("Correo o contraseña incorrectos.")
        form.resetField("password", { keepError: false })
        form.setFocus("password")
      } else if (!applyServerFieldErrors(error, form.setError, ["email", "password"])) {
        setFormError(userMessage(error))
      }
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerClassName="flex-grow justify-center gap-7 px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-2">
            {/* "Hola de nuevo" no le sirve a quien recien llega (auditoria UX-03). */}
            <Title size="xl">Hola</Title>
            <Text tone="muted" className="text-base">
              Ingresa para ver tu ahorro, tus metas y tu portafolio.
            </Text>
          </View>

          {endReason && !formError && <Notice>{END_REASON_MESSAGES[endReason]}</Notice>}
          {formError && <Notice tone="error">{formError}</Notice>}

          <View className="gap-5">
            <Controller
              control={form.control}
              name="email"
              render={({ field }) => (
                <Field
                  label="Correo"
                  placeholder="tu@correo.com"
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                  onSubmitEditing={() => form.setFocus("password")}
                  error={errors.email?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="password"
              render={({ field }) => (
                <Field
                  label="Contraseña"
                  placeholder="Tu contraseña"
                  secureToggle
                  autoComplete="current-password"
                  textContentType="password"
                  returnKeyType="go"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                  // Desde RN 0.88 el evento del teclado no es un evento del DOM: handleSubmit se llama sin el.
                  onSubmitEditing={() => void form.handleSubmit(onSubmit)()}
                  error={errors.password?.message}
                />
              )}
            />
          </View>

          <Button
            label={isSubmitting ? "Ingresando…" : "Iniciar sesión"}
            loading={isSubmitting}
            onPress={form.handleSubmit(onSubmit)}
          />

          <Pressable role="link" onPress={() => router.push("/register")} className="min-h-11 items-center justify-center">
            <Text tone="muted" className="text-sm">
              ¿No tienes cuenta? <Text weight="semibold" className="text-sm">Créala</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
