import { Redirect } from "expo-router"
import { useAuth } from "@/hooks/useAuth"

/**
 * Una ruta que no existe o que esta protegida para la sesion actual. Desde SDK 58,
 * Stack.Protected ya no salta solo a la primera pantalla permitida: sin sesion "/"
 * (el Resumen) quedaba como "Unmatched Route". Aqui se manda a donde corresponde.
 */
export default function NotFound() {
  const { status, endReason } = useAuth()
  if (status === "authenticated") return <Redirect href="/" />
  // Quien acaba de cerrar sesion o vencio su sesion vuelve al login con el aviso; el resto ve la bienvenida.
  return <Redirect href={endReason ? "/login" : "/welcome"} />
}
