import { Pressable, View } from "react-native"
import { Banknote } from "lucide-react-native"
import { Text } from "@/components/ui/Text"
import { CATEGORY_META } from "@/lib/categories"
import { formatDate, formatSoles } from "@/lib/format"
import { usePalette } from "@/theme/palette"
import type { Movement } from "@/types/movements"

export function MovementRow({ movement, onPress }: { movement: Movement; onPress: () => void }) {
  const colors = usePalette()
  const income = movement.kind === "INCOME"
  const meta = movement.category ? CATEGORY_META[movement.category] : null
  const Icon = meta?.icon ?? Banknote
  const title = movement.label || meta?.label || (income ? "Ingreso" : "Gasto")
  const detail = income ? "Ingreso" : (meta?.label ?? "Gasto")

  return (
    <Pressable
      role="button"
      aria-label={`${title}, ${income ? "ingreso" : "gasto"} de ${formatSoles(movement.amount)}`}
      onPress={onPress}
      className="flex-row items-center gap-3 py-3 active:opacity-70"
    >
      <View className="size-10 items-center justify-center rounded-full bg-muted">
        <Icon size={18} color={income ? colors.income : colors.mutedForeground} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text weight="medium" className="text-[15px]" numberOfLines={1}>{title}</Text>
        <Text tone="muted" className="text-xs">{detail} · {formatDate(movement.date)}</Text>
      </View>
      <Text weight="semibold" tone={income ? "income" : "default"} className="text-[15px]">
        {income ? "+" : "−"}{formatSoles(movement.amount)}
      </Text>
    </Pressable>
  )
}
