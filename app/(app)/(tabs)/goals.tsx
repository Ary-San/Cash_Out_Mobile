import { useCallback, useRef, useState } from "react"
import { Pressable, View } from "react-native"
import { router, useFocusEffect } from "expo-router"
import { Plus } from "lucide-react-native"
import { GoalCard } from "@/components/goals/GoalCard"
import { GoalFormSheet } from "@/components/goals/GoalFormSheet"
import { Card } from "@/components/ui/Card"
import { Screen } from "@/components/ui/Screen"
import { Segmented } from "@/components/ui/Segmented"
import { ErrorState, Skeleton } from "@/components/ui/States"
import { Text, Title } from "@/components/ui/Text"
import { useToast } from "@/components/ui/Toast"
import { useApiQuery } from "@/hooks/useApiQuery"
import { formatSoles } from "@/lib/format"
import { groupGoals, type GoalFilter, type GoalGrouping } from "@/lib/goals"
import { financeService } from "@/services/financeService"
import { goalService } from "@/services/goalService"
import { usePalette } from "@/theme/palette"

const GROUPINGS: { value: GoalGrouping; label: string }[] = [
  { value: "estado", label: "Estado" },
  { value: "fecha", label: "Fecha" },
]

export default function GoalsScreen() {
  const colors = usePalette()
  const toast = useToast()
  const goals = useApiQuery(["goals"], (signal) => goalService.list(signal))
  const savings = useApiQuery(["savings"], (signal) => financeService.savings(signal))
  const [grouping, setGrouping] = useState<GoalGrouping>("estado")
  const [filter, setFilter] = useState<GoalFilter>("IN_PROGRESS")
  const [creating, setCreating] = useState(0)

  // Al volver del detalle (un aporte, una meta borrada) la lista tiene que reflejarlo.
  const firstFocus = useRef(true)
  const { reload: reloadGoals } = goals
  const { reload: reloadSavings } = savings
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) firstFocus.current = false
      else {
        reloadGoals()
        reloadSavings()
      }
    }, [reloadGoals, reloadSavings]),
  )

  const list = goals.data ?? []
  const count = (status: GoalFilter) => list.filter((g) => g.status === status).length
  const filters: { value: GoalFilter; label: string }[] = [
    { value: "IN_PROGRESS", label: `En curso (${count("IN_PROGRESS")})` },
    { value: "COMPLETED", label: `Cumplidas (${count("COMPLETED")})` },
    { value: "EXPIRED", label: `Vencidas (${count("EXPIRED")})` },
  ]
  const sections = groupGoals(list, grouping, filter)

  return (
    <View className="flex-1">
      <Screen
        title="Tus metas"
        subtitle={savings.data ? `Apartado ${formatSoles(savings.data.committedAmount)} · Disponible ${formatSoles(savings.data.availableBalance)}` : undefined}
        onRefresh={() => {
          reloadGoals()
          reloadSavings()
        }}
        refreshing={goals.isRefreshing}
      >
        <View className="flex-row items-center justify-between">
          <Text tone="muted" className="text-[13px]">Ver por</Text>
          <View role="radiogroup" aria-label="Agrupar metas" className="flex-row gap-1.5">
            {GROUPINGS.map((g) => (
              <Pressable
                key={g.value}
                role="radio"
                aria-checked={grouping === g.value}
                onPress={() => setGrouping(g.value)}
                className={`h-11 justify-center rounded-full border px-4 ${grouping === g.value ? "border-accent-ink bg-accent" : "border-border"}`}
              >
                <Text weight={grouping === g.value ? "semibold" : "regular"} className="text-[13px]">{g.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {grouping === "estado" ? <Segmented label="Filtrar metas" options={filters} value={filter} onChange={setFilter} /> : null}

        {goals.error ? <ErrorState error={goals.error} onRetry={reloadGoals} /> : null}
        {goals.isLoading ? (
          [0, 1].map((i) => (
            <Card key={i} className="gap-3 p-5">
              <Skeleton width="50%" height={16} />
              <Skeleton height={8} />
              <Skeleton width="70%" height={12} />
            </Card>
          ))
        ) : null}

        {goals.data
          ? sections.map((section) => (
              <View key={section.title || "estado"} className="gap-3">
                {section.title ? (
                  <Text weight="semibold" tone="muted" className="mt-1 text-[13px] uppercase tracking-wide">
                    {section.title} · {section.goals.length}
                  </Text>
                ) : null}
                {section.goals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} onPress={() => router.push({ pathname: "/goal/[id]", params: { id: goal.id } })} />
                ))}
                {section.goals.length === 0 ? (
                  <View className="items-center gap-1.5 rounded-[20px] border border-dashed border-border px-5 py-7">
                    <Title size="md" className="text-center">Todavía nada por aquí</Title>
                    <Text tone="muted" className="text-center text-sm">{section.empty}</Text>
                  </View>
                ) : null}
              </View>
            ))
          : null}
        <View className="h-16" />
      </Screen>

      <Pressable
        role="button"
        onPress={() => setCreating((n) => n + 1)}
        className="absolute bottom-5 right-5 h-14 flex-row items-center gap-2 rounded-full bg-primary px-[22px] active:opacity-80"
        style={{ elevation: 4, shadowColor: "#181928", shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } }}
      >
        <Plus size={18} color={colors.background} />
        <Text weight="medium" tone="inverse" className="text-[15px]">Nueva meta</Text>
      </Pressable>

      {creating > 0 ? (
        <GoalFormSheet
          key={creating}
          visible
          goals={list}
          onClose={() => setCreating(0)}
          onSaved={(goal) => {
            setCreating(0)
            reloadGoals()
            toast(`Meta creada: ${goal.name}`)
            router.push({ pathname: "/goal/[id]", params: { id: goal.id } })
          }}
        />
      ) : null}
    </View>
  )
}
