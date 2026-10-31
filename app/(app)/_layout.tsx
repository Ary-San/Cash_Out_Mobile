import { Stack } from "expo-router"

/** Las pestanas van abajo; los detalles (un gasto, un activo) se abren encima. */
export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
