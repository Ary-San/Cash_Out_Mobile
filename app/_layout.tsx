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
import { useFonts } from "expo-font"
import { Button } from "@/components/ui/Button"
import { Text, Title } from "@/components/ui/Text"
import { ToastProvider } from "@/components/ui/Toast"
import { AuthProvider } from "@/contexts/AuthProvider"
import { useAuth } from "@/hooks/useAuth"
import { usePalette } from "@/theme/palette"
import { applyStoredTheme } from "@/theme/themePreference"

// splash hasta encontrar sesiones guardadas y cargar las fuentes
SplashScreen.preventAutoHideAsync()
applyStoredTheme()

function RootNavigator() {
  const { status, retryRestore } = useAuth()
  const colors = usePalette()
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
  })
  // Si una fuente no carga, la app sigue con la del sistema en vez de quedarse en el splash.
  const ready = status !== "restoring" && (fontsLoaded || fontError !== null)

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync()
  }, [ready])

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
      </View>
    )
  }

  const signedIn = status === "authenticated"
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
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
