import { Text as NativeText, type TextProps as NativeTextProps } from "react-native"

const WEIGHTS = {
  regular: "font-sans",
  medium: "font-sans-medium",
  semibold: "font-sans-semibold",
} as const

/**
 * Cuanto puede crecer la letra con el tamano del sistema. Crece de verdad (hasta
 * 1.6 veces el texto, 1.3 los titulos, que ya son grandes), pero sin romper el layout.
 */
export const MAX_TEXT_SCALE = 1.6
const MAX_TITLE_SCALE = 1.3

const TONES = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  accent: "text-accent-ink",
  destructive: "text-destructive",
  income: "text-income",
  expense: "text-expense",
  warning: "text-warning",
  /** Sube o baja: precios y ganancias. */
  gain: "text-gain",
  loss: "text-loss",
  /** Sobre un fondo del color del texto, como el del aviso. */
  inverse: "text-background",
} as const

interface TextProps extends NativeTextProps {
  weight?: keyof typeof WEIGHTS
  tone?: keyof typeof TONES
}

/**
 * El texto de la app: Geist y los colores del tema. El peso y el color van por
 * props y no en className, porque dos clases de color a la vez no se pisan en orden.
 */
export function Text({ weight = "regular", tone = "default", className = "", ...props }: TextProps) {
  return <NativeText maxFontSizeMultiplier={MAX_TEXT_SCALE} className={`${WEIGHTS[weight]} ${TONES[tone]} ${className}`} {...props} />
}

/** Titulos en Instrument Serif, como en la web. */
export function Title({ size = "lg", className = "", ...props }: NativeTextProps & { size?: "md" | "lg" | "xl" }) {
  const scale = { md: "text-2xl", lg: "text-4xl", xl: "text-5xl" }[size]
  return (
    <NativeText
      accessibilityRole="header"
      maxFontSizeMultiplier={MAX_TITLE_SCALE}
      className={`font-display text-foreground ${scale} ${className}`}
      {...props}
    />
  )
}
