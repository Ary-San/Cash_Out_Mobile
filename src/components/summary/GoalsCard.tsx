import { Pressable, View } from "react-native"
import { TriangleAlert } from "lucide-react-native"
import { Card } from "@/components/ui/Card"
import { Text } from "@/components/ui/Text"
import { formatDate, formatSoles } from "@/lib/format"
import { goalPace } from "@/lib/goalPace"
import { usePalette } from "@/theme/palette"
import type { SavingsGoal } from "@/types/goals"

/** Las metas que vencen antes. Atrasada se dice con icono y texto, no solo con color. */
export function GoalsCard({ goals, onSeeAll }: { goals: SavingsGoal[]; onSeeAll: () => void }) {
  const colors = usePalette()

  return (
    <Card className="gap-4 p-5">
      <View className="flex-row items-center justify-between">
        <Text weight="semibold" className="text-[15px]">Tus metas</Text>
        <Pressable role="link" onPress={onSeeAll} className="min-h-11 justify-center">
          <Text tone="accent" className="text-[13px]">Ver todas</Text>
        </Pressable>
      </View>
      {goals.map((goal) => {
        const pace = goalPace(goal)
        const status = pace.late
          ? `Atrasada: aparta ${formatSoles(pace.perMonth)} al mes para el ${formatDate(goal.deadline)}`
          : `En camino para el ${formatDate(goal.deadline)}`
        return (
          <View key={goal.id} className="gap-2">
            <View className="flex-row items-baseline justify-between gap-2">
              <Text weight="medium" className="flex-1 text-[15px]" numberOfLines={1}>{goal.name}</Text>
              <Text tone="muted" className="text-[13px]">
                {formatSoles(goal.accumulatedAmount)} de {formatSoles(goal.targetAmount)}
              </Text>
            </View>
            <View
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pace.progress * 100)}
              aria-label={`${goal.name}: ${Math.round(pace.progress * 100)} % de la meta`}
              className="h-2 overflow-hidden rounded-full bg-muted"
            >
              <View
                className="h-full rounded-full"
                style={{ width: `${pace.progress * 100}%`, backgroundColor: pace.late ? colors.warning : colors.accentInk }}
              />
            </View>
            <View className="flex-row items-center gap-1.5">
              {pace.late ? <TriangleAlert size={14} color={colors.warning} /> : null}
              <Text tone={pace.late ? "warning" : "muted"} className="flex-1 text-[13px]">{status}</Text>
            </View>
          </View>
        )
      })}
    </Card>
  )
}
