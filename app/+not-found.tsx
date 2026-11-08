import { Redirect } from "expo-router"
import { useAuth } from "@/hooks/useAuth"

/**
 * Una ruta que no existe o que esta protegida para la sesion actual. Desde SDK 58,
 * Stack.Protected ya no salta solo a la primera pantalla permitida: sin sesion "/"
 * (el Resumen) quedaba como "Unmatched Route". Aqui se manda a donde corresponde.
 */
export default function NotFound() {
  const { status } = useAuth()
  return <Redirect href={status === "authenticated" ? "/" : "/login"} />
}
