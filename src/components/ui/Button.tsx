import { Pressable, Text } from "react-native"

interface ButtonProps {
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  variant?: "primary" | "outline"
}

export function Button({ label, onPress, loading = false, disabled = false, variant = "primary" }: ButtonProps) {
  const inactive = disabled || loading
  const surface = variant === "primary" ? "bg-primary" : "border border-border bg-transparent"
  const ink = variant === "primary" ? "text-primary-foreground" : "text-foreground"

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      className={`h-12 items-center justify-center rounded-full active:opacity-80 ${surface} ${inactive ? "opacity-50" : ""}`}
    >
      <Text className={`font-sans-medium text-[15px] ${ink}`}>{label}</Text>
    </Pressable>
  )
}
