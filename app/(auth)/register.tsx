import { useEffect, useState } from "react"
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, MailCheck } from "lucide-react-native"
import { toApiError, userMessage } from "@/api/errors"
import { Button } from "@/components/ui/Button"
import { DatePickerField } from "@/components/ui/DatePickerField"
import { Field } from "@/components/ui/Field"
import { Notice } from "@/components/ui/Notice"
import { PasswordChecklist } from "@/components/ui/PasswordChecklist"
import { Text, Title } from "@/components/ui/Text"
import { useAuth } from "@/hooks/useAuth"
import { addDays, todayIso, yesterdayIso } from "@/lib/dates"
import { applyServerFieldErrors } from "@/lib/formErrors"
import { registerFormSchema, type RegisterFormValues } from "@/lib/validation"
import { authService } from "@/services/authService"
import { usePalette } from "@/theme/palette"

const FIELDS = ["name", "email", "password", "birthDate"] as const

export default function RegisterScreen() {
  const { register } = useAuth()
  const colors = usePalette()
  const [formError, setFormError] = useState<string | null>(null)
  // El backend pidio confirmar el correo: no hay sesion todavia.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { name: "", email: "", password: "", birthDate: "", accepted: false },
  })
  const { isSubmitting, errors } = form.formState
  const password = useWatch({ control: form.control, name: "password" })

  const onSubmit = async (values: RegisterFormValues) => {
    setFormError(null)
    try {
      const result = await register({
        name: values.name,
        email: values.email,
        password: values.password,
        birthDate: values.birthDate || undefined,
      })
      // Con sesion abierta, Stack.Protected pasa solo al Resumen.
      if (result.verificationRequired) setPendingEmail(result.user.email)
    } catch (err) {
      const error = toApiError(err)
      if (error.status === 409) {
        form.setError("email", { type: "server", message: userMessage(error) }, { shouldFocus: true })
      } else if (!applyServerFieldErrors(error, form.setError, FIELDS)) {
        setFormError(userMessage(error))
      }
    }
  }

  if (pendingEmail) return <CheckYourEmail email={pendingEmail} />

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerClassName="w-full max-w-[480px] flex-grow justify-center gap-6 self-center px-6 py-8" keyboardShouldPersistTaps="handled">
          <View className="gap-2">
            <Title size="xl">Crea tu cuenta</Title>
            <Text tone="muted" className="text-base">
              Registra tus ingresos y gastos, ahorra para tus metas y aprende a invertir sin arriesgar dinero real.
            </Text>
          </View>

          {formError ? <Notice tone="error">{formError}</Notice> : null}

          <View className="gap-5">
            <Controller
              control={form.control}
              name="name"
              render={({ field }) => (
                <Field
                  label="Nombre"
                  placeholder="Como quieres que te saludemos"
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="name"
                  returnKeyType="next"
                  maxLength={120}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                  onSubmitEditing={() => form.setFocus("email")}
                  error={errors.name?.message}
                />
              )}
            />
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
            <View className="gap-2">
              <Controller
                control={form.control}
                name="password"
                render={({ field }) => (
                  <Field
                    label="Contraseña"
                    placeholder="Crea una contraseña"
                    secureToggle
                    autoComplete="new-password"
                    textContentType="newPassword"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                    error={errors.password?.message}
                  />
                )}
              />
              <PasswordChecklist value={password} />
            </View>
            <Controller
              control={form.control}
              name="birthDate"
              render={({ field }) => (
                <DatePickerField
                  label="Fecha de nacimiento"
                  value={field.value}
                  onChange={field.onChange}
                  fallback={addDays(todayIso(), -365 * 20)}
                  max={yesterdayIso()}
                  error={errors.birthDate?.message}
                  hint="Opcional."
                />
              )}
            />
            <Controller
              control={form.control}
              name="accepted"
              render={({ field }) => (
                <View className="gap-1.5">
                  <Pressable
                    role="checkbox"
                    aria-checked={field.value}
                    onPress={() => field.onChange(!field.value)}
                    className="min-h-12 flex-row items-start gap-3 py-1"
                  >
                    <View
                      className={`mt-0.5 size-[22px] items-center justify-center rounded-md border-2 ${field.value ? "border-primary bg-primary" : errors.accepted ? "border-destructive" : "border-input"}`}
                    >
                      {field.value ? <Check size={14} color={colors.card} strokeWidth={3} /> : null}
                    </View>
                    <Text tone="muted" className="flex-1 text-sm leading-5">
                      Entiendo que Cash-Out es un <Text weight="semibold" className="text-sm">proyecto académico</Text> y que invierto con{" "}
                      <Text weight="semibold" className="text-sm">fichas</Text>, no con dinero real.
                    </Text>
                  </Pressable>
                  {errors.accepted ? <Text tone="destructive" className="text-sm">{errors.accepted.message}</Text> : null}
                </View>
              )}
            />
          </View>

          <Button label={isSubmitting ? "Creando tu cuenta…" : "Crear cuenta"} loading={isSubmitting} onPress={() => void form.handleSubmit(onSubmit)()} />

          <Pressable role="link" onPress={() => router.replace("/login")} className="min-h-11 items-center justify-center">
            <Text tone="muted" className="text-sm">
              ¿Ya tienes cuenta? <Text weight="semibold" className="text-sm">Inicia sesión</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const RESEND_WAIT_SECONDS = 30

/** La cuenta se creo pero hay que confirmar el correo: sin eso no se puede entrar. */
function CheckYourEmail({ email }: { email: string }) {
  const colors = usePalette()
  const [wait, setWait] = useState(RESEND_WAIT_SECONDS)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (wait <= 0) return
    const timer = setTimeout(() => setWait((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])

  const resend = async () => {
    setSending(true)
    // El backend responde igual exista o no el correo: no hay error que mostrar.
    await authService.resendVerification(email).catch(() => undefined)
    setSending(false)
    setSent(true)
    setWait(RESEND_WAIT_SECONDS)
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="w-full max-w-[480px] flex-1 justify-center gap-5 self-center px-6">
        <View className="size-14 items-center justify-center rounded-2xl bg-accent">
          <MailCheck size={26} color={colors.accentInk} />
        </View>
        <Title size="lg">Tu cuenta está creada</Title>
        <Text className="text-base leading-6">
          Abre el enlace que enviamos a <Text weight="semibold" className="text-base">{email}</Text> para confirmar que es tuyo. Después vuelve aquí e inicia sesión.
        </Text>
        {sent ? <Notice>Te enviamos un enlace nuevo. Revisa también la carpeta de spam.</Notice> : null}
        <Button label={wait > 0 ? `Reenviar en ${wait} s` : "Reenviar el enlace"} variant="outline" disabled={wait > 0} loading={sending} onPress={() => void resend()} />
        <Button label="Ir a iniciar sesión" onPress={() => router.replace("/login")} />
      </View>
    </SafeAreaView>
  )
}
