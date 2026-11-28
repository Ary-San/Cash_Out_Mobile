import { Pressable, View } from "react-native"
import { Card } from "@/components/ui/Card"
import { Text } from "@/components/ui/Text"
import { CATEGORY_META } from "@/lib/categories"
import { formatSoles } from "@/lib/format"
import { useCategoryColors, usePalette } from "@/theme/palette"
import type { Budget } from "@/types/budgets"

/**
 * Los presupuestos del mes en el Resumen. Al 80 % la barra se pone en alerta y al
 * 100 % en rojo; los avisos de la campanita salen solos al anotar el gasto.
 */
export function BudgetsCard({ budgets, onEdit }: { budgets: Budget[]; onEdit: () => void }) {
  const colors = usePalette()
  const categoryColors = useCategoryColors()

  return (
    <Card className="gap-3.5 p-5">
      <View className="flex-row items-center justify-between">
        <Text weight="semibold" className="text-[15px]">Presupuestos del mes</Text>
        <Pressable role="link" onPress={onEdit} className="min-h-11 justify-center">
          <Text tone="accent" className="text-[13px]">{budgets.length > 0 ? "Editar" : "Crear"}</Text>
        </Pressable>
      </View>
      {budgets.length === 0 ? (
        <Text tone="muted" className="text-sm leading-5">
          Ponte un tope por categoría (por ejemplo, S/ 300 en comida) y te avisamos al llegar al 80 % y al 100 %.
        </Text>
      ) : (
        budgets.map((budget) => {
          const percent = Math.round(budget.share * 100)
          const over = budget.share >= 1
          const tone = over ? colors.destructive : budget.share >= 0.8 ? colors.warning : categoryColors[budget.category]
          return (
            <View
              key={budget.category}
              className="gap-1.5"
              accessible
              accessibilityLabel={`${budget.name}: ${formatSoles(budget.spent)} de ${formatSoles(budget.limit)}, ${percent} %`}
            >
              <View className="flex-row items-center gap-2">
                <Text className="flex-1 text-sm">{CATEGORY_META[budget.category].label}</Text>
                <Text tone="muted" className="text-[13px]">{formatSoles(budget.spent)} de {formatSoles(budget.limit)}</Text>
              </View>
              <View className="h-2 overflow-hidden rounded-full bg-muted">
                <View className="h-full rounded-full" style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: tone }} />
              </View>
              <Text tone={over ? "destructive" : "muted"} className="text-xs">
                {over ? `Te pasaste por ${formatSoles(budget.spent - budget.limit)}` : `Te quedan ${formatSoles(budget.remaining)} · ${percent} %`}
              </Text>
            </View>
          )
        })
      )}
    </Card>
  )
}
