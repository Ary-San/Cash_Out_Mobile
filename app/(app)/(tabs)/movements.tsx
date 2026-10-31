import { useCallback, useRef, useState } from "react"
import { Pressable, View } from "react-native"
import { router, useFocusEffect } from "expo-router"
import { Plus, ReceiptText, ScanLine } from "lucide-react-native"
import { PhraseComposer } from "@/components/assistant/PhraseComposer"
import { MovementRow } from "@/components/movements/MovementRow"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Screen } from "@/components/ui/Screen"
import { Segmented } from "@/components/ui/Segmented"
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States"
import { useApiQuery } from "@/hooks/useApiQuery"
import { expenseToMovement, incomeToMovement, movementKey, type MovementFilter } from "@/lib/movements"
import { expenseService } from "@/services/expenseService"
import { incomeService } from "@/services/incomeService"
import { movementService } from "@/services/movementService"
import { usePalette } from "@/theme/palette"

const PAGE = 20

const FILTERS: { value: MovementFilter; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "EXPENSE", label: "Gastos" },
  { value: "INCOME", label: "Ingresos" },
]

export default function MovementsScreen() {
  const [filter, setFilter] = useState<MovementFilter>("ALL")
  // "Ver más" pide la lista mas larga de una vez: asi no hay paginas que juntar ni repetidos.
  const [pages, setPages] = useState(1)
  const colors = usePalette()

  const query = useApiQuery(["movements", filter, pages], async (signal) => {
    const params = { page: 0, size: PAGE * pages, sort: "date,desc" }
    if (filter === "EXPENSE") {
      const data = await expenseService.list(params, signal)
      return { ...data, content: data.content.map(expenseToMovement) }
    }
    if (filter === "INCOME") {
      const data = await incomeService.list(params, signal)
      return { ...data, content: data.content.map(incomeToMovement) }
    }
    return movementService.list(params, signal)
  })
  const { reload } = query

  // Al volver de crear o editar, la lista tiene que mostrar el cambio. El primer foco ya trae la carga inicial.
  const firstFocus = useRef(true)
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) firstFocus.current = false
      else reload()
    }, [reload]),
  )

  const movements = query.data?.content ?? []
  const hasMore = query.data ? query.data.totalElements > movements.length : false

  return (
    <Screen
      title="Movimientos"
      subtitle="Tus gastos e ingresos"
      onRefresh={reload}
      refreshing={query.isRefreshing}
      action={
        <View className="flex-row gap-2">
          <Pressable
            role="button"
            aria-label="Escanear boleta"
            onPress={() => router.push("/scan")}
            className="size-11 items-center justify-center rounded-full border border-border"
          >
            <ScanLine size={20} color={colors.foreground} />
          </Pressable>
          <Pressable
            role="button"
            aria-label="Registrar a mano"
            onPress={() => router.push("/movement/new")}
            className="size-11 items-center justify-center rounded-full bg-primary"
          >
            <Plus size={20} color={colors.background} />
          </Pressable>
        </View>
      }
    >
      <PhraseComposer onSaved={reload} />

      <Segmented
        label="Filtrar movimientos"
        options={FILTERS}
        value={filter}
        onChange={(next) => {
          setFilter(next)
          setPages(1)
        }}
      />

      {query.error ? <ErrorState error={query.error} onRetry={reload} /> : null}

      {query.isLoading ? (
        <Card className="gap-4">
          {[0, 1, 2].map((row) => (
            <View key={row} className="flex-row items-center gap-3">
              <Skeleton width={40} height={40} />
              <View className="flex-1 gap-2">
                <Skeleton width="60%" height={14} />
                <Skeleton width="35%" height={10} />
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {query.data && movements.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Todavía no hay movimientos"
          message="Escribe una frase arriba, escanea el QR de una boleta o regístralo a mano."
          action={{ label: "Registrar a mano", onPress: () => router.push("/movement/new") }}
        />
      ) : null}

      {movements.length > 0 ? (
        <Card className="py-1">
          {movements.map((movement, index) => (
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
      ) : null}

      {hasMore ? (
        <Button label="Ver más" variant="outline" loading={query.isRefreshing} onPress={() => setPages((n) => n + 1)} />
      ) : null}
    </Screen>
  )
}
