import { View } from "react-native"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Screen } from "@/components/ui/Screen"
import { Segmented } from "@/components/ui/Segmented"
import { Text, Title } from "@/components/ui/Text"
import { useAsyncAction } from "@/hooks/useAsyncAction"
import { useAuth } from "@/hooks/useAuth"
import { initials } from "@/lib/format"
import { useThemePreference, type ThemePreference } from "@/theme/themePreference"

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
]

export default function ProfileScreen() {
  const { user, logout } = useAuth()
  const { run: signOut, isPending } = useAsyncAction(logout)
  const [theme, setTheme] = useThemePreference()

  return (
    <Screen title="Perfil">
      <Card className="flex-row items-center gap-4">
        <View className="size-14 items-center justify-center rounded-full bg-accent">
          <Title size="md" className="text-accent-ink">{initials(user?.name)}</Title>
        </View>
        <View className="flex-1 gap-0.5">
          <Text weight="semibold" className="text-lg" numberOfLines={1}>{user?.name}</Text>
          <Text tone="muted" className="text-sm" numberOfLines={1}>{user?.email}</Text>
        </View>
      </Card>

      <View className="gap-2">
        <Text weight="medium" className="text-sm">Apariencia</Text>
        <Segmented label="Tema de la app" options={THEMES} value={theme} onChange={setTheme} />
      </View>

      <Button label="Cerrar sesión" variant="outline" loading={isPending} onPress={() => void signOut()} />
    </Screen>
  )
}
