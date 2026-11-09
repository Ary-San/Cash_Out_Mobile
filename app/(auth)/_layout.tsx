import { Stack } from "expo-router"

// La bienvenida va primero: desde el login o el registro, "volver" lleva a ella.
export const unstable_settings = { initialRouteName: "welcome" }

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
