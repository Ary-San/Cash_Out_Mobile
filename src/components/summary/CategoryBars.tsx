import { Pressable, View } from "react-native"
import { Card } from "@/components/ui/Card"
import { Text } from "@/components/ui/Text"
import { CATEGORY_META } from "@/lib/categories"
import { formatSoles } from "@/lib/format"
import type { CategoryTotal } from "@/lib/monthPace"
import { useCategoryColors } from "@/theme/palette"

/** ¿En que se me va? Barras horizontales: en un telefono se leen mejor que un donut. */
export function CategoryBars({ categories, onSeeAll }: { categories: CategoryTotal[]; onSeeAll: () => void }) {
  const colors = useCategoryColors()
  const top = categories.slice(0, 4)
  const biggest = top[0]?.total ?? 1

  return (
    <Card className="gap-3.5 p-5">
      <View className="flex-row items-center justify-between">
        <Text weight="semibold" className="text-[15px]">En qué se te va</Text>
        <Pressable role="link" onPress={onSeeAll} className="min-h-11 justify-center">
          <Text tone="accent" className="text-[13px]">Ver todo</Text>
        </Pressable>
      </View>
      {top.map(({ category, total, share }) => (
        <View
          key={category}
          className="gap-1.5"
          accessible
          accessibilityLabel={`${CATEGORY_META[category].label}: ${formatSoles(total)}, ${Math.round(share * 100)} % del gasto`}
        >
          <View className="flex-row items-center gap-2">
            <View className="size-2.5 rounded-[3px]" style={{ backgroundColor: colors[category] }} />
            <Text className="flex-1 text-sm">{CATEGORY_META[category].label}</Text>
            <Text weight="semibold" className="text-sm">{formatSoles(total)}</Text>
            <Text tone="muted" className="w-10 text-right text-[13px]">{Math.round(share * 100)} %</Text>
          </View>
          <View className="h-2 overflow-hidden rounded-full bg-muted">
            <View className="h-full rounded-full" style={{ width: `${(total / biggest) * 100}%`, backgroundColor: colors[category] }} />
          </View>
        </View>
      ))}
    </Card>
  )
}
