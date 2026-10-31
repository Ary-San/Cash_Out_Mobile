import { useColorScheme } from "nativewind"

/**
 * Los mismos colores de global.css, para lo que no acepta clases: la barra de
 * pestanas, los iconos y los placeholders. Si cambia uno alla, cambia aca.
 */
export type Palette = Record<
  | "background" | "foreground" | "card" | "primary" | "muted" | "mutedForeground"
  | "accent" | "accentInk" | "border" | "destructive" | "income" | "expense",
  string
>

export const palette: Record<"light" | "dark", Palette> = {
  light: {
    background: "#f8f8f9",
    foreground: "#181928",
    card: "#ffffff",
    primary: "#3f4058",
    muted: "#eeeef1",
    mutedForeground: "#606174",
    accent: "#eae3e9",
    accentInk: "#7a6178",
    border: "#cccccc",
    destructive: "#9a3e67",
    income: "#606939",
    expense: "#7f5175",
  },
  dark: {
    background: "#0c0c15",
    foreground: "#f1f1f5",
    card: "#141520",
    primary: "#cccccc",
    muted: "#242534",
    mutedForeground: "#acadb7",
    accent: "#332d3a",
    accentInk: "#c9b6c8",
    border: "#3f4058",
    destructive: "#db87a8",
    income: "#b9bf97",
    expense: "#c8a4c3",
  },
}

export function usePalette(): Palette {
  const { colorScheme } = useColorScheme()
  return palette[colorScheme === "dark" ? "dark" : "light"]
}
