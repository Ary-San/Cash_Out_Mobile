import { useColorScheme } from "nativewind"
import type { ExpenseCategory } from "@/types/movements"

/**
 * Los mismos colores de global.css, para lo que no acepta clases: la barra de
 * pestanas, los iconos y los placeholders. Si cambia uno alla, cambia aca.
 */
export type Palette = Record<
  | "background" | "foreground" | "card" | "primary" | "muted" | "mutedForeground"
  | "accent" | "accentInk" | "border" | "destructive" | "income" | "expense" | "warning" | "gain" | "loss"
  /** Solo para sombras: en oscuro casi no se ven, ahi el contraste lo da el color del boton. */
  | "shadow",
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
    warning: "#81632f",
    gain: "#0b7a55",
    loss: "#b91c1c",
    shadow: "#181928",
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
    warning: "#d5ba82",
    gain: "#29a87c",
    loss: "#e05a5a",
    shadow: "#000000",
  },
}

export function usePalette(): Palette {
  const { colorScheme } = useColorScheme()
  return palette[colorScheme === "dark" ? "dark" : "light"]
}

/** Un color por categoria, los mismos de la web (--series-1 a 7), para barras y marcas. */
const categoryColors: Record<"light" | "dark", Record<ExpenseCategory, string>> = {
  light: {
    FOOD: "#a35a98", TRANSPORT: "#c6852f", SERVICES: "#4f84c4", EDUCATION: "#76962c",
    LEISURE: "#d66a88", HEALTH: "#8673d1", OTHER: "#2d9a85",
  },
  dark: {
    FOOD: "#b56aa9", TRANSPORT: "#bf8233", SERVICES: "#5f92d2", EDUCATION: "#7fa03a",
    LEISURE: "#d46e8b", HEALTH: "#9483dc", OTHER: "#3aa892",
  },
}

/** Los mismos siete colores, por posicion: para los activos del portafolio. */
const seriesColors: Record<"light" | "dark", string[]> = {
  light: Object.values(categoryColors.light),
  dark: Object.values(categoryColors.dark),
}

export function useSeriesColors(): string[] {
  const { colorScheme } = useColorScheme()
  return seriesColors[colorScheme === "dark" ? "dark" : "light"]
}

export function useCategoryColors(): Record<ExpenseCategory, string> {
  const { colorScheme } = useColorScheme()
  return categoryColors[colorScheme === "dark" ? "dark" : "light"]
}

/** Los pliegues de la seda de la bienvenida, de la sombra al brillo: los mismos de la portada web. */
export const silk: Record<"light" | "dark", readonly string[]> = {
  light: ["#f8f8f9", "#f3edf3", "#e9dfe8", "#dccfdb", "#c9b6c8", "#b7a0b5", "#a48aa2", "#8f7590"],
  dark: ["#0c0c15", "#121320", "#1d1d2d", "#2e2a3e", "#463a50", "#634e62", "#87708a", "#ac93aa"],
}
