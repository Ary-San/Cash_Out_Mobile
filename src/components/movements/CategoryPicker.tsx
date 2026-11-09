import { Pressable, View } from "react-native"
import { Text } from "@/components/ui/Text"
import { CATEGORY_META } from "@/lib/categories"
import { usePalette } from "@/theme/palette"
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/types/movements"
import { TOUCH_SLOP } from "@/lib/touch"

interface CategoryPickerProps {
  value: ExpenseCategory | null
  onChange: (category: ExpenseCategory) => void
  /** Las que sugiere el asistente cuando no esta seguro: se marcan con borde punteado. */
  suggested?: ReadonlySet<ExpenseCategory>
  error?: string
}

export function CategoryPicker({ value, onChange, suggested, error }: CategoryPickerProps) {
  const colors = usePalette()

  return (
    <View className="gap-1.5">
      <Text weight="medium" className="text-sm">Categoría</Text>
      <View role="radiogroup" aria-label="Categoría" className="flex-row flex-wrap gap-2">
        {EXPENSE_CATEGORIES.map((category) => {
          const { label, icon: Icon } = CATEGORY_META[category]
          const selected = value === category
          const hinted = !selected && suggested?.has(category)
          return (
            <Pressable
              hitSlop={TOUCH_SLOP}
              key={category}
              role="radio"
              aria-checked={selected}
              aria-label={label}
              onPress={() => onChange(category)}
              className={`min-h-10 flex-row items-center gap-1.5 rounded-full border px-3 ${
                selected ? "border-accent-ink bg-accent" : hinted ? "border-dashed border-accent-ink" : "border-border"
              }`}
            >
              <Icon size={16} color={selected ? colors.accentInk : colors.mutedForeground} />
              <Text weight={selected ? "medium" : "regular"} className="text-sm">{label}</Text>
            </Pressable>
          )
        })}
      </View>
      {error ? <Text tone="destructive" className="text-sm">{error}</Text> : null}
    </View>
  )
}
