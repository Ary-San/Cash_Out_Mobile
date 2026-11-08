import { Pressable, View } from "react-native"
import { CircleCheck, CircleMinus, Clock, Target, TriangleAlert, type LucideIcon } from "lucide-react-native"
import { Text } from "@/components/ui/Text"
import { formatSoles } from "@/lib/format"
import { goalPace, type GoalPace } from "@/lib/goalPace"
import { goalStatusText } from "@/lib/goals"
import { usePalette, type Palette } from "@/theme/palette"
import type { SavingsGoal } from "@/types/goals"

export interface GoalTone {
  bar: string
  ink: string
  icon: LucideIcon
  label: string
}

/** Color e icono segun el estado: atrasada, vencida y cumplida no se distinguen solo por el color. */
export function goalTone(goal: SavingsGoal, pace: GoalPace, colors: Palette): GoalTone {
  if (goal.status === "COMPLETED") return { bar: colors.income, ink: colors.income, icon: CircleCheck, label: "Cumplida" }
  if (goal.status === "EXPIRED") return { bar: colors.mutedForeground, ink: colors.mutedForeground, icon: CircleMinus, label: "Vencida" }
  if (pace.late) return { bar: colors.warning, ink: colors.warning, icon: TriangleAlert, label: "Atrasada" }
  return { bar: colors.accentInk, ink: colors.mutedForeground, icon: Clock, label: "En camino" }
}

export function GoalCard({ goal, onPress }: { goal: SavingsGoal; onPress: () => void }) {
  const colors = usePalette()
  const pace = goalPace(goal)
  const tone = goalTone(goal, pace, colors)
  const status = goalStatusText(goal, pace)
  const percent = `${Math.floor(pace.progress * 100)} %`

  return (
    <Pressable
      role="button"
      aria-label={`${goal.name}: ${percent} de la meta. ${status}`}
      onPress={onPress}
      className={`gap-3 rounded-[20px] border border-border bg-card p-[18px] active:opacity-80 ${goal.status === "EXPIRED" ? "opacity-85" : ""}`}
    >
      <View className="flex-row items-center gap-3">
        <View className="size-10 items-center justify-center rounded-full bg-accent">
          <Target size={20} color={colors.accentInk} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text weight="semibold" className="text-base" numberOfLines={1}>{goal.name}</Text>
          <Text tone="muted" className="text-[13px]">
            {formatSoles(goal.accumulatedAmount)} de {formatSoles(goal.targetAmount)}
          </Text>
        </View>
        <Text weight="semibold" className="text-xl">{percent}</Text>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-muted">
        <View className="h-full rounded-full" style={{ width: `${pace.progress * 100}%`, backgroundColor: tone.bar }} />
      </View>
      <View className="flex-row items-center gap-1.5">
        <tone.icon size={14} color={tone.ink} />
        <Text className="flex-1 text-[13px]" style={{ color: tone.ink }}>{status}</Text>
      </View>
    </Pressable>
  )
}
