import type { Href } from "expo-router"

/**
 * Los avisos traen la ruta de la web ("/metas", "/perfil#perfil-sesiones"): aqui
 * se traduce a la pantalla de la app. Lo que no se reconoce no lleva a ningun lado.
 */
const ROUTES: [RegExp, Href][] = [
  [/^\/resumen/, "/"],
  [/^\/metas/, "/goals"],
  [/^\/portafolio/, "/portfolio"],
  [/^\/movimientos/, "/movements"],
  [/^\/perfil#perfil-sesiones/, "/settings/sessions"],
  [/^\/perfil/, "/profile"],
]

export function appRoute(link: string | null): Href | null {
  if (!link) return null
  return ROUTES.find(([pattern]) => pattern.test(link))?.[1] ?? null
}
