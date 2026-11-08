import { useCallback, useRef, useState } from "react"
import { Pressable, View } from "react-native"
import { router, useFocusEffect } from "expo-router"
import { KeyRound, Mail, Smartphone, Trash2, UserRound } from "lucide-react-native"
import { DeleteAccountSheet } from "@/components/profile/DeleteAccountSheet"
import { SettingsGroup, SettingsRow } from "@/components/profile/SettingsGroup"
import { UserAvatar } from "@/components/profile/UserAvatar"
import { Card } from "@/components/ui/Card"
import { Screen } from "@/components/ui/Screen"
import { Segmented } from "@/components/ui/Segmented"
import { Text, Title } from "@/components/ui/Text"
import { useApiQuery } from "@/hooks/useApiQuery"
import { useAsyncAction } from "@/hooks/useAsyncAction"
import { useAuth } from "@/hooks/useAuth"
import { formatDateTime } from "@/lib/format"
import { ROLE_LABEL, memberSince } from "@/lib/profile"
import { autoRegisterService } from "@/services/autoRegisterService"
import { useThemePreference, type ThemePreference } from "@/theme/themePreference"

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
]

export default function ProfileScreen() {
  const { user, logout, hasRole } = useAuth()
  const { run: signOut, isPending } = useAsyncAction(logout)
  const [theme, setTheme] = useThemePreference()
  const [deleting, setDeleting] = useState(false)
  const [version, setVersion] = useState(0)
  const student = hasRole("USER")

  const gmail = useApiQuery(["gmail-status", version, student], (signal) => (student ? autoRegisterService.gmailStatus(signal) : Promise.resolve(null)))
  const token = useApiQuery(["ingest-token", version, student], (signal) => (student ? autoRegisterService.tokenStatus(signal) : Promise.resolve(null)))

  // Al volver de un ajuste (Gmail conectado, token nuevo) los estados tienen que reflejarlo.
  const firstFocus = useRef(true)
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) firstFocus.current = false
      else setVersion((n) => n + 1)
    }, []),
  )

  if (!user) return null

  const gmailState = gmail.data
  const gmailDescription = !gmailState
    ? "Tus consumos del BCP llegan solos a Movimientos"
    : !gmailState.available
      ? "No disponible en este servidor por ahora"
      : gmailState.connected
        ? gmailState.status === "EXPIRED"
          ? "Google ya no da permiso: vuelve a conectarlo"
          : `Gmail · última lectura ${gmailState.lastCheckedAt ? formatDateTime(gmailState.lastCheckedAt) : "pendiente"}`
        : "Conecta Gmail para traer tus consumos del BCP"
  const gmailStatus = gmailState?.available
    ? { label: gmailState.connected ? (gmailState.status === "EXPIRED" ? "Reconectar" : "Conectado") : "Sin conectar", on: gmailState.connected && gmailState.status !== "EXPIRED" }
    : undefined

  return (
    <View className="flex-1">
      <Screen title="Perfil">
        <Card className="flex-row items-center gap-4">
          <UserAvatar user={user} size={64} />
          <View className="flex-1 gap-1">
            <Title size="md" className="leading-7">{user.name}</Title>
            {/* El correo completo, en hasta dos lineas: el dominio tiene que verse. */}
            <Text tone="muted" className="text-sm leading-5" numberOfLines={2}>{user.email}</Text>
            <View className="mt-1 flex-row flex-wrap gap-1.5">
              {user.roles.map((role) => (
                <View key={role} className="rounded-full bg-accent px-2.5 py-0.5">
                  <Text weight="semibold" tone="accent" className="text-xs">{ROLE_LABEL[role]}</Text>
                </View>
              ))}
              <View className="rounded-full bg-muted px-2.5 py-0.5">
                <Text weight="medium" className="text-xs">{memberSince(user.createdAt)}</Text>
              </View>
            </View>
          </View>
        </Card>

        <SettingsGroup title="Cuenta">
          <SettingsRow first icon={UserRound} label="Datos personales" description="Nombre, foto y fecha de nacimiento" onPress={() => router.push("/settings/details")} />
          {user.googleOnly ? (
            <SettingsRow icon={KeyRound} label="Contraseña" description="Tu cuenta está vinculada a Google: entras con ella." status={{ label: "Google", on: false }} />
          ) : (
            <SettingsRow icon={KeyRound} label="Contraseña" description="Al cambiarla, se cierran tus otras sesiones" onPress={() => router.push("/settings/password")} />
          )}
        </SettingsGroup>

        {student ? (
          <SettingsGroup title="Registro automático">
            <SettingsRow first icon={Mail} label="Correos del banco" description={gmailDescription} status={gmailStatus} onPress={() => router.push("/settings/gmail")} />
            <SettingsRow
              icon={Smartphone}
              label="Atajo de iPhone"
              description="Registra tus pagos con Apple Pay"
              status={token.data ? { label: token.data.active ? "Activo" : "Sin token", on: token.data.active } : undefined}
              onPress={() => router.push("/settings/shortcut")}
            />
          </SettingsGroup>
        ) : null}

        <View className="gap-2">
          <Text accessibilityRole="header" weight="medium" tone="muted" className="px-1 text-[11px] uppercase tracking-widest">Apariencia</Text>
          <Card className="gap-2.5">
            <Text weight="medium" className="text-[15px]">Tema</Text>
            <Segmented label="Tema de la app" options={THEMES} value={theme} onChange={setTheme} />
            <Text tone="muted" className="text-[13px]">
              {theme === "system" ? "Sigue el tema de tu teléfono." : "Se queda así aunque cambies el tema del teléfono."}
            </Text>
          </Card>
        </View>

        <SettingsGroup title="Zona de riesgo" danger>
          <SettingsRow first danger icon={Trash2} label="Eliminar cuenta" description="Se borran tu cuenta y todos tus datos. No se puede deshacer." onPress={() => setDeleting(true)} />
        </SettingsGroup>

        <Pressable
          role="button"
          disabled={isPending}
          onPress={() => void signOut()}
          className="min-h-12 items-center justify-center self-center px-5 active:opacity-70"
        >
          <Text weight="medium" tone="muted" className="text-[15px]">{isPending ? "Cerrando sesión…" : "Cerrar sesión"}</Text>
        </Pressable>
      </Screen>

      <DeleteAccountSheet visible={deleting} onClose={() => setDeleting(false)} />
    </View>
  )
}
