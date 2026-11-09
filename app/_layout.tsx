import "../global.css"
import { useEffect } from "react"
import { View } from "react-native"
import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { useColorScheme } from "nativewind"
import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold } from "@expo-google-fonts/geist"
import { InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic } from "@expo-google-fonts/instrument-serif"
import { RadioCanadaBig_700Bold } from "@expo-google-fonts/radio-canada-big"
import { useFonts } from "expo-font"
import { LockScreen } from "@/components/auth/LockScreen"
import { Button } from "@/components/ui/Button"
import { OfflineBanner } from "@/components/ui/OfflineBanner"
import { Text, Title } from "@/components/ui/Text"
import { ToastProvider } from "@/components/ui/Toast"
import { AuthProvider } from "@/contexts/AuthProvider"
import { useAppLock } from "@/hooks/useAppLock"
import { useAuth } from "@/hooks/useAuth"
import { onReconnect } from "@/lib/network"
import { usePalette } from "@/theme/palette"
import { applyStoredTheme } from "@/theme/themePreference"

// splash hasta encontrar sesiones guardadas y cargar las fuentes
SplashScreen.preventAutoHideAsync()
applyStoredTheme()

function RootNavigator() {
  const { status, retryRestore } = useAuth()
  const lock = useAppLock(status)
  const colors = usePalette()
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    // Solo para el logotipo CASH-OUT, como en la web.
    RadioCanadaBig_700Bold,
  })
  // Si una fuente no carga, la app sigue con la del sistema en vez de quedarse en el splash.
  const ready = status !== "restoring" && (fontsLoaded || fontError !== null)

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync()
  }, [ready])

  // Sin red al abrir: la sesion guardada se restaura sola cuando vuelve.
  useEffect(() => (status === "unavailable" ? onReconnect(retryRestore) : undefined), [status, retryRestore])

  if (!ready) return null

  if (status === "unavailable") {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-8">
        <Title size="md" className="text-center">No pudimos conectar</Title>
        <Text tone="muted" className="text-center text-base">
          Tu sesión sigue guardada. Revisa tu conexión e inténtalo de nuevo.
        </Text>
        <View className="w-full">
          <Button label="Reintentar" onPress={retryRestore} />
        </View>
        <Text tone="muted" className="text-center text-xs">Si era la red, entramos solos apenas vuelva.</Text>
      </View>
    )
  }

  const signedIn = status === "authenticated"
  return (
    <View className="flex-1">
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
      {/* Encima de la navegacion: al desbloquear se sigue en la misma pantalla. */}
      {lock.locked ? (
        <View className="absolute inset-0">
          <LockScreen onUnlock={lock.unlock} />
        </View>
      ) : null}
      <OfflineBanner />
    </View>
  )
}

export default function RootLayout() {
  const { colorScheme } = useColorScheme()

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ToastProvider>
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
          <RootNavigator />
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
