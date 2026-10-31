import { useState } from "react"
import { Appearance, Platform } from "react-native"
import * as SecureStore from "expo-secure-store"
import { colorScheme } from "nativewind"

export type ThemePreference = "system" | "light" | "dark"

const KEY = "cashout.theme"
const VALUES: readonly ThemePreference[] = ["system", "light", "dark"]

/** En la web no hay SecureStore: ahi se sigue al sistema. */
function read(): ThemePreference {
  try {
    const stored = SecureStore.getItem(KEY)
    return VALUES.includes(stored as ThemePreference) ? (stored as ThemePreference) : "system"
  } catch {
    return "system"
  }
}

let current: ThemePreference = "system"

/**
 * "Sistema" se resuelve aca y no en NativeWind: con darkMode "class", en la web
 * NativeWind reporta el modo del sistema pero no pone la clase, y la barra de
 * pestanas quedaba oscura sobre pantallas claras.
 */
function apply(preference: ThemePreference): void {
  // En la web, Expo pre-renderiza cada pagina en el servidor, donde no hay documento al que aplicarle el tema.
  if (Platform.OS === "web" && typeof document === "undefined") return
  // getColorScheme tambien puede decir null o "unspecified": entonces, claro.
  const system = Appearance.getColorScheme() === "dark" ? "dark" : "light"
  colorScheme.set(preference === "system" ? system : preference)
}

let listening = false

/** Se llama una vez al abrir la app, antes de pintar la primera pantalla. */
export function applyStoredTheme(): void {
  current = read()
  apply(current)
  if (!listening) {
    listening = true
    Appearance.addChangeListener(() => {
      if (current === "system") apply("system")
    })
  }
}

export function useThemePreference(): [ThemePreference, (next: ThemePreference) => void] {
  const [preference, setPreference] = useState(current)

  const change = (next: ThemePreference) => {
    current = next
    setPreference(next)
    apply(next)
    try {
      SecureStore.setItem(KEY, next)
    } catch {
      // Sin almacenamiento se aplica igual, solo que no se recuerda.
    }
  }

  return [preference, change]
}
