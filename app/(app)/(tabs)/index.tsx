import { useCallback, useRef } from "react"
import { Pressable, View } from "react-native"
import { router, useFocusEffect } from "expo-router"
import { ChevronRight, HandCoins, Sparkles } from "lucide-react-native"
import { MovementRow } from "@/components/movements/MovementRow"
import { BalanceCard } from "@/components/summary/BalanceCard"
import { BudgetsCard } from "@/components/summary/BudgetsCard"
import { CategoryBars } from "@/components/summary/CategoryBars"
import { GoalsCard } from "@/components/summary/GoalsCard"
import { MonthCard } from "@/components/summary/MonthCard"
import { NotificationBell } from "@/components/summary/NotificationBell"
import { ACTION_ICONS, FirstSteps, QuickActions, TokenChip } from "@/components/summary/SummaryActions"
import { Card } from "@/components/ui/Card"
import { Screen } from "@/components/ui/Screen"
import { ErrorState, Skeleton } from "@/components/ui/States"
import { Text } from "@/components/ui/Text"
import { useApiQuery } from "@/hooks/useApiQuery"
import { useAuth } from "@/hooks/useAuth"
import { todayIso } from "@/lib/dates"
import { firstName, longToday } from "@/lib/format"
import { nearestGoals } from "@/lib/goalPace"
import { monthOf, monthPace, previousMonthOf } from "@/lib/monthPace"
import { movementKey } from "@/lib/movements"
import { budgetService } from "@/services/budgetService"
import { financeService } from "@/services/financeService"
import { goalService } from "@/services/goalService"
import { movementService } from "@/services/movementService"
import { usePalette } from "@/theme/palette"

const MONTH_NAME = new Intl.DateTimeFormat("es-PE", { month: "long" })

/** Un bloque gris del tamano de la tarjeta, solo mientras su peticion esta en curso. */
function CardSkeleton({ height }: { height: number }) {
  return (
    <Card className="gap-3 p-5" accessibilityLabel="Cargando">
      <Skeleton width="40%" height={14} />
      <Skeleton height={height} />
    </Card>
  )
}

export default function SummaryScreen() {
  const { user } = useAuth()
  const colors = usePalette()
  const month = monthOf(todayIso())
  const previousMonth = previousMonthOf(month)
  const monthName = MONTH_NAME.format(new Date(`${month}-15T12:00:00`)).toLowerCase()
  const previousName = MONTH_NAME.format(new Date(`${previousMonth}-15T12:00:00`)).toLowerCase()

  const savings = useApiQuery(["savings"], (signal) => financeService.savings(signal))
  const wallet = useApiQuery(["wallet"], (signal) => financeService.wallet(signal))
  const goals = useApiQuery(["goals"], (signal) => goalService.list(signal))
  const recent = useApiQuery(["recent"], (signal) => movementService.list({ page: 0, size: 5, sort: "date,desc" }, signal))
  const current = useApiQuery(["month", month], (signal) => movementService.month(month, signal))
  const previous = useApiQuery(["month", previousMonth], (signal) => movementService.month(previousMonth, signal))
  const budgets = useApiQuery(["budgets"], (signal) => budgetService.list(signal))

  const queries = [savings, wallet, goals, recent, current, previous, budgets]
  const reloadAll = () => queries.forEach((query) => query.reload())
  const refreshing = queries.some((query) => query.isRefreshing)

  // Al volver de registrar algo, el Resumen tiene que mostrarlo. El primer foco ya trae la carga inicial.
  const firstFocus = useRef(true)
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) firstFocus.current = false
      else queries.forEach((query) => query.reload())
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  )

  const pace = current.data && previous.data ? monthPace(current.data, previous.data, month) : undefined
  const inProgress = goals.data?.filter((goal) => goal.status === "IN_PROGRESS") ?? []
  const isNew = recent.data?.totalElements === 0
  const monthError = current.error ?? previous.error

  return (
    <Screen
      title={`Hola, ${firstName(user?.name)}`}
      subtitle={longToday()}
      action={
        <View className="flex-row items-center gap-2">
          {wallet.data ? <TokenChip balance={wallet.data.tokenBalance} /> : null}
          <NotificationBell />
        </View>
      }
      onRefresh={reloadAll}
      refreshing={refreshing}
    >
      {savings.error ? <ErrorState error={savings.error} onRetry={savings.reload} /> : null}
      {savings.data ? (
        <BalanceCard
          savings={savings.data}
          month={pace ? { earned: pace.earned, spent: pace.spent } : undefined}
          goalsInProgress={inProgress.length}
        />
      ) : savings.isLoading ? (
        <CardSkeleton height={40} />
      ) : null}

      <QuickActions
        actions={[
          { label: "Registrar", icon: ACTION_ICONS.register, onPress: () => router.push("/movement/new") },
          { label: "Escanear", icon: ACTION_ICONS.scan, onPress: () => router.push("/scan") },
          { label: "Aportar", icon: ACTION_ICONS.contribute, onPress: () => router.navigate("/goals") },
        ]}
      />

      {/* Minijuegos ya tiene su pestaña: aqui va el acceso al asistente, que no tiene otra entrada a la vista. */}
      <Pressable role="link" aria-label="Pregúntale a Cash-Out: consulta tus finanzas con el asistente" onPress={() => router.push("/assistant-chat")} className="active:opacity-80">
        <Card className="min-h-14 flex-row items-center gap-3 py-3">
          <View className="size-9 items-center justify-center rounded-xl bg-accent">
            <Sparkles size={18} color={colors.accentInk} />
          </View>
          <View className="flex-1">
            <Text weight="semibold" className="text-sm">Pregúntale a Cash-Out</Text>
            <Text tone="muted" className="text-xs">«¿En qué gasté más este mes?» y te responde con gráficos</Text>
          </View>
          <ChevronRight size={18} color={colors.mutedForeground} />
        </Card>
      </Pressable>

      <Pressable role="link" aria-label="Cuentas compartidas: quién te debe y a quién le debes" onPress={() => router.push("/split-bills")} className="active:opacity-80">
        <Card className="min-h-14 flex-row items-center gap-3 py-3">
          <View className="size-9 items-center justify-center rounded-xl bg-muted">
            <HandCoins size={18} color={colors.foreground} />
          </View>
          <View className="flex-1">
            <Text weight="semibold" className="text-sm">Cuentas compartidas</Text>
            <Text tone="muted" className="text-xs">Divide la cena o el taxi y recuerda por WhatsApp</Text>
          </View>
          <ChevronRight size={18} color={colors.mutedForeground} />
        </Card>
      </Pressable>

      {isNew ? <FirstSteps /> : null}

      {!isNew && monthError ? <ErrorState error={monthError} onRetry={() => { current.reload(); previous.reload() }} /> : null}
      {!isNew && pace ? (
        <>
          <MonthCard pace={pace} monthName={monthName} previousName={previousName} />
          {pace.categories.length > 0 ? (
            <CategoryBars categories={pace.categories} onSeeAll={() => router.push("/movements")} />
          ) : null}
        </>
      ) : !isNew && !monthError ? (
        <CardSkeleton height={96} />
      ) : null}

      {!isNew && budgets.data ? <BudgetsCard budgets={budgets.data} onEdit={() => router.push("/budgets")} /> : null}

      {goals.error ? <ErrorState error={goals.error} onRetry={goals.reload} /> : null}
      {!isNew && inProgress.length > 0 ? <GoalsCard goals={nearestGoals(inProgress)} onSeeAll={() => router.navigate("/goals")} /> : null}

      {recent.error ? <ErrorState error={recent.error} onRetry={recent.reload} /> : null}
      {recent.data && recent.data.content.length > 0 ? (
        <Card className="px-5 py-2">
          <View className="flex-row items-center justify-between">
            <Text weight="semibold" className="text-[15px]">Últimos movimientos</Text>
            <Pressable role="link" onPress={() => router.push("/movements")} className="min-h-11 justify-center">
              <Text tone="accent" className="text-[13px]">Ver todos</Text>
            </Pressable>
          </View>
          {recent.data.content.map((movement, index) => (
            <View key={movementKey(movement)} className={index > 0 ? "border-t border-border" : ""}>
              <MovementRow
                movement={movement}
                onPress={() =>
                  router.push({ pathname: "/movement/[kind]/[id]", params: { kind: movement.kind, id: movement.id } })
                }
              />
            </View>
          ))}
        </Card>
      ) : recent.isLoading ? (
        <CardSkeleton height={120} />
      ) : null}
    </Screen>
  )
}
