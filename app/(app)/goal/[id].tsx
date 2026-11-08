import { useState } from "react"
import { Pressable, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { ArrowUp, Check, Ellipsis, Flag, Pencil, Trash2, Wallet } from "lucide-react-native"
import { toApiError, userMessage } from "@/api/errors"
import { Celebration } from "@/components/goals/Celebration"
import { ContributeSheet } from "@/components/goals/ContributeSheet"
import { goalTone } from "@/components/goals/GoalCard"
import { ForecastLines, MonthlyBars, ProgressRing } from "@/components/goals/GoalCharts"
import { GoalFormSheet } from "@/components/goals/GoalFormSheet"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Notice } from "@/components/ui/Notice"
import { Screen } from "@/components/ui/Screen"
import { Sheet } from "@/components/ui/Sheet"
import { ErrorState, Skeleton } from "@/components/ui/States"
import { Text } from "@/components/ui/Text"
import { useToast } from "@/components/ui/Toast"
import { useApiQuery } from "@/hooks/useApiQuery"
import { formatDate, formatSoles } from "@/lib/format"
import { goalPace } from "@/lib/goalPace"
import { SOURCE_LABEL, completionReward, contributionsByMonth, forecastChart, monthName, serverDay } from "@/lib/goals"
import { financeService } from "@/services/financeService"
import { goalService } from "@/services/goalService"
import { usePalette } from "@/theme/palette"

type Panel = "none" | "contribute" | "actions" | "edit" | "delete"

export default function GoalDetailScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const colors = usePalette()
  const toast = useToast()
  const goals = useApiQuery(["goals"], (signal) => goalService.list(signal))
  const contributions = useApiQuery(["contributions", id], (signal) => goalService.contributions(id, signal))
  const savings = useApiQuery(["savings"], (signal) => financeService.savings(signal))
  const [panel, setPanel] = useState<Panel>("none")
  const [celebrate, setCelebrate] = useState<{ name: string; target: number; tokens: number } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const goal = goals.data?.find((g) => g.id === id)
  const reloadAll = () => {
    goals.reload()
    contributions.reload()
    savings.reload()
  }

  if (!goal) {
    return (
      <Screen back title="Meta">
        {goals.error ? <ErrorState error={goals.error} onRetry={goals.reload} /> : null}
        {goals.isLoading ? <Skeleton height={188} /> : null}
        {goals.data ? <Notice tone="error">No encontramos esta meta. Puede que la hayas borrado.</Notice> : null}
      </Screen>
    )
  }

  const pace = goalPace(goal)
  const tone = goalTone(goal, pace, colors)
  const inProgress = goal.status === "IN_PROGRESS"
  const percent = `${Math.floor(pace.progress * 100)} %`
  const etaText = pace.eta ? monthName(pace.eta) : goal.accumulatedAmount > 0 ? "aún es pronto para estimar" : "sin aportes todavía"
  const facts: [string, string, boolean?][] =
    goal.status === "COMPLETED"
      ? [["Juntaste", formatSoles(goal.targetAmount)], ["Cumplida el", goal.completedAt ? formatDate(serverDay(goal.completedAt)) : "—"]]
      : goal.status === "EXPIRED"
        ? [["Juntaste", `${formatSoles(goal.accumulatedAmount)} de ${formatSoles(goal.targetAmount)}`], ["Venció el", formatDate(goal.deadline)], ["Faltaron", formatSoles(pace.remaining)]]
        : [
            ["Falta", formatSoles(pace.remaining)],
            ["Vence el", formatDate(goal.deadline)],
            ["A tu ritmo llegas en", etaText, pace.late],
            ["Para llegar a tiempo", `${formatSoles(pace.perMonth)} al mes`, pace.late],
          ]
  const forecastText = pace.eta
    ? pace.eta.getTime() > pace.end
      ? `A este ritmo llegas en ${monthName(pace.eta)}, después de la fecha límite. Con ${formatSoles(pace.perMonth)} al mes llegas a tiempo.`
      : `A este ritmo llegas en ${monthName(pace.eta)}, antes de la fecha límite.`
    : ""

  const onContributed = (amount: number) => {
    setPanel("none")
    const before = goal.accumulatedAmount / goal.targetAmount
    const after = (goal.accumulatedAmount + amount) / goal.targetAmount
    reloadAll()
    if (after >= 1) {
      setCelebrate({ name: goal.name, target: goal.targetAmount, tokens: completionReward(goal.targetAmount) })
      return
    }
    const crossed = [0.75, 0.5, 0.25].find((m) => before < m && after >= m)
    toast(crossed ? `¡Pasaste el ${crossed * 100} % de ${goal.name}!` : `Aportaste ${formatSoles(amount)} a ${goal.name}`)
  }

  const remove = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await goalService.remove(goal.id)
      const freed = inProgress ? goal.accumulatedAmount : 0
      toast(freed > 0 ? `Meta borrada · ${formatSoles(freed)} volvió a tu disponible` : "Meta borrada")
      router.back()
    } catch (err) {
      setDeleteError(userMessage(toApiError(err)))
      setDeleting(false)
    }
  }

  return (
    <View className="flex-1">
      <Screen
        back
        title={goal.name}
        onRefresh={reloadAll}
        refreshing={goals.isRefreshing}
        action={
          <Pressable role="button" aria-label="Más opciones de la meta" onPress={() => setPanel("actions")} className="size-11 items-center justify-center rounded-full border border-border">
            <Ellipsis size={20} color={colors.foreground} />
          </Pressable>
        }
      >
        <View className="items-center gap-3.5">
          <ProgressRing progress={pace.progress} color={tone.bar} label={percent} caption={`${formatSoles(goal.accumulatedAmount)}\nde ${formatSoles(goal.targetAmount)}`} />
          <View className="h-[30px] flex-row items-center gap-1.5 rounded-full px-3" style={{ backgroundColor: `${tone.bar}1F` }}>
            <tone.icon size={14} color={tone.ink === colors.mutedForeground ? colors.foreground : tone.ink} />
            <Text weight="semibold" className="text-[13px]" style={{ color: tone.ink === colors.mutedForeground ? colors.foreground : tone.ink }}>{tone.label}</Text>
          </View>
        </View>

        {goal.status === "EXPIRED" ? (
          <View className="gap-1.5 rounded-[20px] border border-dashed border-border p-4">
            <Text weight="semibold" className="text-[15px]">Esta meta venció sin completarse</Text>
            <Text tone="muted" className="text-sm leading-5">
              Lo que juntaste ({formatSoles(goal.accumulatedAmount)}) ya no está apartado: volvió a tu disponible. Ya no recibe aportes; puedes borrarla o crear una nueva.
            </Text>
          </View>
        ) : null}

        <Card className="px-[18px] py-1.5">
          {facts.map(([label, value, warn], i) => (
            <View key={label} className={`min-h-12 flex-row items-baseline justify-between gap-3 py-3 ${i > 0 ? "border-t border-border" : ""}`}>
              <Text tone="muted" className="text-sm">{label}</Text>
              <Text weight="semibold" tone={warn ? "warning" : "default"} className="flex-1 text-right text-[15px]">{value}</Text>
            </View>
          ))}
        </Card>

        {inProgress && pace.eta && contributions.data ? (
          <Card className="gap-2.5 p-[18px]">
            <Text weight="semibold" className="text-[15px]">Hacia dónde vas</Text>
            <Text tone="muted" className="text-sm leading-5">{forecastText}</Text>
            <ForecastLines
              chart={forecastChart(goal, contributions.data, pace, 314, 112)}
              color={tone.bar}
              deadlineColor={pace.late ? colors.warning : colors.mutedForeground}
              description={forecastText}
            />
          </Card>
        ) : null}

        <View className="flex-row gap-2" accessibilityLabel="Hitos">
          {[25, 50, 75, 100].map((m) => {
            const reached = pace.progress * 100 >= m
            const Icon = reached ? Check : Flag
            return (
              <View key={m} className={`h-14 flex-1 items-center justify-center gap-0.5 rounded-2xl border ${reached ? "border-accent bg-accent" : "border-dashed border-border"}`}>
                <Icon size={16} color={reached ? colors.accentInk : colors.mutedForeground} />
                <Text weight="semibold" tone={reached ? "accent" : "muted"} className="text-xs">{m} %</Text>
              </View>
            )
          })}
        </View>

        <Card className="gap-1.5 px-[18px] pb-1.5 pt-4">
          <View className="flex-row items-baseline justify-between">
            <Text weight="semibold" className="text-[15px]">Tus aportes</Text>
            {contributions.data ? (
              <Text tone="muted" className="text-[13px]">{contributions.data.length === 1 ? "1 aporte" : `${contributions.data.length} aportes`}</Text>
            ) : null}
          </View>
          {contributions.error ? <ErrorState error={contributions.error} onRetry={contributions.reload} /> : null}
          {contributions.isLoading ? <Skeleton height={96} /> : null}
          {contributions.data && contributions.data.length > 0 ? (
            <>
              <MonthlyBars months={contributionsByMonth(contributions.data)} color={tone.bar} />
              {contributions.data.map((c) => {
                const Icon = c.source === "INCOME" ? Wallet : ArrowUp
                return (
                  <View key={c.id} className="min-h-14 flex-row items-center gap-3 border-t border-border">
                    <View className="size-8 items-center justify-center rounded-full bg-muted">
                      <Icon size={16} color={colors.income} />
                    </View>
                    <View className="flex-1">
                      <Text weight="medium" className="text-sm">{SOURCE_LABEL[c.source]}</Text>
                      <Text tone="muted" className="text-xs">{formatDate(serverDay(c.createdAt))}</Text>
                    </View>
                    <Text weight="semibold" tone="income" className="text-[15px]">+{formatSoles(c.amount)}</Text>
                  </View>
                )
              })}
            </>
          ) : contributions.data ? (
            <Text tone="muted" className="py-3 text-sm">Todavía no aportas a esta meta.</Text>
          ) : null}
        </Card>
        <View className="h-16" />
      </Screen>

      {inProgress || goal.status === "EXPIRED" ? (
        <View className="absolute inset-x-0 bottom-0 bg-background px-5 pb-6 pt-3">
          {inProgress ? (
            <Button label="Aportar" onPress={() => setPanel("contribute")} />
          ) : (
            <Button label="Crear una meta nueva" variant="outline" onPress={() => router.navigate("/goals")} />
          )}
        </View>
      ) : null}

      {savings.data && panel === "contribute" ? (
        <ContributeSheet goal={goal} available={savings.data.availableBalance} color={tone.bar} visible onClose={() => setPanel("none")} onDone={onContributed} />
      ) : null}

      <Sheet visible={panel === "actions"} onClose={() => setPanel("none")}>
        {inProgress ? (
          <Pressable role="button" onPress={() => setPanel("edit")} className="min-h-14 flex-row items-center gap-3.5">
            <Pencil size={20} color={colors.foreground} />
            <Text className="text-base">Editar meta</Text>
          </Pressable>
        ) : null}
        <Pressable role="button" onPress={() => setPanel("delete")} className="min-h-14 flex-row items-center gap-3.5">
          <Trash2 size={20} color={colors.destructive} />
          <Text tone="destructive" className="text-base">Borrar meta</Text>
        </Pressable>
        <Button label="Cancelar" variant="outline" onPress={() => setPanel("none")} />
      </Sheet>

      <Sheet visible={panel === "delete"} onClose={() => setPanel("none")} locked={deleting} title={`¿Borrar ${goal.name}?`}>
        <Text tone="muted" className="text-[15px] leading-6">
          Se eliminará {goal.name} con su historial de aportes.{" "}
          {inProgress && goal.accumulatedAmount > 0 ? `Lo que aportaste (${formatSoles(goal.accumulatedAmount)}) vuelve a tu saldo disponible. ` : ""}
          Esta acción no se puede deshacer.
        </Text>
        {deleteError ? <Notice tone="error">{deleteError}</Notice> : null}
        <Button label="Borrar meta" variant="destructive" loading={deleting} onPress={() => void remove()} />
        <Button label="Cancelar" variant="outline" onPress={() => setPanel("none")} />
      </Sheet>

      {panel === "edit" ? (
        <GoalFormSheet
          visible
          goals={goals.data ?? []}
          editing={goal}
          onClose={() => setPanel("none")}
          onSaved={() => {
            setPanel("none")
            reloadAll()
            toast("Cambios guardados")
          }}
        />
      ) : null}

      <Celebration
        visible={celebrate !== null}
        name={celebrate?.name ?? ""}
        target={celebrate?.target ?? 0}
        tokens={celebrate?.tokens ?? 0}
        onClose={() => setCelebrate(null)}
      />
    </View>
  )
}
