import { Text, View } from "react-native"

export function Notice({ tone = "info", children }: { tone?: "info" | "error"; children: string }) {
  const surface = tone === "error" ? "border-destructive" : "border-border"
  const ink = tone === "error" ? "text-destructive" : "text-foreground"
  return (
    <View accessibilityRole="alert" className={`rounded-xl border bg-card px-4 py-3 ${surface}`}>
      <Text className={`font-sans text-sm ${ink}`}>{children}</Text>
    </View>
  )
}
