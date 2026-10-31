import { Text as NativeText, type TextProps as NativeTextProps } from "react-native"

const WEIGHTS = {
  regular: "font-sans",
  medium: "font-sans-medium",
  semibold: "font-sans-semibold",
} as const

const TONES = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  accent: "text-accent-ink",
  destructive: "text-destructive",
  income: "text-income",
  expense: "text-expense",
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
  return <NativeText className={`${WEIGHTS[weight]} ${TONES[tone]} ${className}`} {...props} />
}

/** Titulos en Instrument Serif, como en la web. */
export function Title({ size = "lg", className = "", ...props }: NativeTextProps & { size?: "md" | "lg" | "xl" }) {
  const scale = { md: "text-2xl", lg: "text-4xl", xl: "text-5xl" }[size]
  return (
    <NativeText
      accessibilityRole="header"
      className={`font-display text-foreground ${scale} ${className}`}
      {...props}
    />
  )
}
