import { useState } from "react"
import { Pressable, View } from "react-native"
import * as ImagePicker from "expo-image-picker"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Camera, Lock } from "lucide-react-native"
import { userMessage, toApiError } from "@/api/errors"
import { UserAvatar } from "@/components/profile/UserAvatar"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { DatePickerField } from "@/components/ui/DatePickerField"
import { Field } from "@/components/ui/Field"
import { Notice } from "@/components/ui/Notice"
import { Screen } from "@/components/ui/Screen"
import { Text, Title } from "@/components/ui/Text"
import { useToast } from "@/components/ui/Toast"
import { useAuth } from "@/hooks/useAuth"
import { addDays, todayIso, yesterdayIso } from "@/lib/dates"
import { firstName } from "@/lib/format"
import { avatarError } from "@/lib/profile"
import { profileSchema } from "@/lib/validation"
import { userService, type PickedPhoto } from "@/services/userService"
import type { User } from "@/types/auth"
import { usePalette } from "@/theme/palette"

type PhotoChange = { kind: "keep" } | { kind: "replace"; photo: PickedPhoto } | { kind: "remove" }
const KEEP: PhotoChange = { kind: "keep" }

export default function DetailsScreen() {
  const { user } = useAuth()
  // La pestaña de Perfil ya exige sesion; sin usuario no hay nada que editar.
  if (!user) return null
  return <DetailsForm key={user.id} initial={user} />
}

function DetailsForm({ initial }: { initial: User }) {
  const colors = usePalette()
  const insets = useSafeAreaInsets()
  const toast = useToast()
  // Lo guardado se compara con el usuario de la sesion, que cambia al guardar.
  const { user: session, updateUser } = useAuth()
  const user = session ?? initial
  const [name, setName] = useState(user.name)
  const [birth, setBirth] = useState(user.birthDate ?? "")
  const [photo, setPhoto] = useState<PhotoChange>(KEEP)
  const [errors, setErrors] = useState<{ name?: string; birthDate?: string; photo?: string }>({})
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<string>()

  const dataChanged = name !== user.name || birth !== (user.birthDate ?? "")
  const changed = dataChanged || photo.kind !== "keep"
  const hasPhoto = photo.kind === "replace" || (photo.kind === "keep" && Boolean(user.avatarUpdatedAt))
  const preview = photo.kind === "replace" ? photo.photo.uri : photo.kind === "remove" ? null : undefined

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.7 })
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    const problem = avatarError(asset)
    setErrors((prev) => ({ ...prev, photo: problem ?? undefined }))
    if (!problem) setPhoto({ kind: "replace", photo: { uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName } })
  }

  const discard = () => {
    setName(user.name)
    setBirth(user.birthDate ?? "")
    setPhoto(KEEP)
    setErrors({})
    setFailure(undefined)
  }

  const save = async () => {
    const parsed = profileSchema.safeParse({ name, birthDate: birth })
    const next: typeof errors = {}
    if (!parsed.success) for (const issue of parsed.error.issues) next[issue.path[0] as "name" | "birthDate"] ??= issue.message
    // El backend ignora los campos que no llegan: una fecha ya guardada no se puede borrar.
    if (birth === "" && user.birthDate) next.birthDate = "Puedes cambiar la fecha, pero no dejarla vacía."
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    setFailure(undefined)
    try {
      let saved = user
      if (dataChanged) saved = await userService.updateMe({ name: name.trim(), birthDate: birth || undefined })
      if (photo.kind === "replace") saved = await userService.uploadAvatar(photo.photo)
      if (photo.kind === "remove") saved = await userService.removeAvatar()
      updateUser(saved)
      setName(saved.name)
      setBirth(saved.birthDate ?? "")
      setPhoto(KEEP)
      toast(`Perfil actualizado: el Resumen ya te saluda como ${firstName(saved.name)}.`)
    } catch (err) {
      const error = toApiError(err)
      const fields = { name: error.fieldErrors.name, birthDate: error.fieldErrors.birthDate }
      if (fields.name || fields.birthDate) setErrors(fields)
      else setFailure(userMessage(error))
    }
    setSaving(false)
  }

  return (
    <View className="flex-1">
      <Screen back title="Datos personales">
        <View className="items-center gap-2.5">
          <View className="rounded-full" style={{ padding: 3, borderWidth: 2, borderColor: photo.kind === "keep" ? "transparent" : colors.accentInk }}>
            <UserAvatar user={user} size={96} preview={preview} />
          </View>
          <View className="flex-row gap-2">
            <Pressable role="button" onPress={() => void pickPhoto()} className="min-h-11 flex-row items-center gap-2 rounded-full border border-border bg-card px-4 active:opacity-70">
              <Camera size={16} color={colors.foreground} />
              <Text weight="medium" className="text-sm">{hasPhoto ? "Cambiar foto" : "Elegir foto"}</Text>
            </Pressable>
            {hasPhoto ? (
              <Pressable
                role="button"
                onPress={() => setPhoto(user.avatarUpdatedAt ? { kind: "remove" } : KEEP)}
                className="min-h-11 justify-center rounded-full px-4 active:opacity-70"
              >
                <Text weight="medium" tone="muted" className="text-sm">Quitar</Text>
              </Pressable>
            ) : null}
          </View>
          {errors.photo ? (
            <Text tone="destructive" className="text-center text-[13px]">{errors.photo}</Text>
          ) : (
            <Text tone="muted" className="text-center text-xs">JPG, PNG o GIF de hasta 2 MB. La recortas en un cuadrado.</Text>
          )}
        </View>

        <View className="gap-1.5">
          <Field
            label="Nombre"
            value={name}
            onChangeText={(value) => {
              setName(value)
              setErrors((prev) => ({ ...prev, name: undefined }))
            }}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            maxLength={120}
            error={errors.name}
          />
          {!errors.name ? <Text tone="muted" className="text-[13px]">Así te saludamos y así apareces en las carreras de trading.</Text> : null}
        </View>

        <View className="gap-1.5">
          <Text weight="medium" className="text-sm">Correo</Text>
          <View className="min-h-12 flex-row items-center gap-2 rounded-xl border border-border bg-muted px-4 py-3">
            {/* Un correo largo no tiene espacios: se corta en cualquier letra para que se vea entero. */}
            <Text tone="muted" className="min-w-0 flex-1 break-all text-base">{user.email}</Text>
            <View className="shrink-0">
              <Lock size={16} color={colors.mutedForeground} />
            </View>
          </View>
          <Text tone="muted" className="text-[13px]">No se puede cambiar: con él inicias sesión.</Text>
        </View>

        <DatePickerField
          label="Fecha de nacimiento"
          value={birth}
          onChange={(value) => {
            setBirth(value)
            setErrors((prev) => ({ ...prev, birthDate: undefined }))
          }}
          fallback={addDays(todayIso(), -365 * 20)}
          max={yesterdayIso()}
          error={errors.birthDate}
          hint={user.birthDate ? "Puedes corregirla, pero no dejarla vacía." : "Opcional."}
        />

        <Card className="gap-1 border-transparent bg-muted">
          <Text weight="medium" tone="muted" className="text-[11px] uppercase tracking-widest">Así te saluda el Resumen</Text>
          <Title size="md">Hola, {firstName(name)}</Title>
        </Card>

        {failure ? <Notice tone="error">{failure}</Notice> : null}
        <View style={{ height: 112 }} />
      </Screen>

      <View className="absolute inset-x-0 bottom-0 gap-2 border-t border-border bg-background px-5 pt-2.5" style={{ paddingBottom: insets.bottom + 12 }}>
        <Text aria-live="polite" tone="muted" className="text-center text-[13px]">{changed ? "Cambios sin guardar" : "Todo está guardado"}</Text>
        <View className="flex-row gap-2.5">
          <View className="flex-1"><Button label="Descartar" variant="outline" disabled={!changed || saving} onPress={discard} /></View>
          <View className="flex-1"><Button label="Guardar" disabled={!changed} loading={saving} onPress={() => void save()} /></View>
        </View>
      </View>
    </View>
  )
}
