import { useState } from "react"
import { View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { toApiError, userMessage } from "@/api/errors"
import { MovementForm, type MovementValues } from "@/components/movements/MovementForm"
import { Button } from "@/components/ui/Button"
import { Notice } from "@/components/ui/Notice"
import { Screen } from "@/components/ui/Screen"
import { ErrorState, Skeleton } from "@/components/ui/States"
import { useToast } from "@/components/ui/Toast"
import { useApiQuery } from "@/hooks/useApiQuery"
import { amountToField } from "@/lib/amount"
import { expenseService } from "@/services/expenseService"
import { incomeService } from "@/services/incomeService"
import type { ExpenseInput, IncomeInput } from "@/types/movements"

export default function MovementDetailScreen() {
  const params = useLocalSearchParams<{ kind: string; id: string }>()
  const expense = params.kind === "EXPENSE"
  const id = Number(params.id)
  const noun = expense ? "gasto" : "ingreso"
  const toast = useToast()
  // Borrar no tiene vuelta atras: el primer toque pide confirmar y el segundo borra.
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const query = useApiQuery(["movement", params.kind, id], async (signal): Promise<MovementValues> => {
    if (expense) {
      const item = await expenseService.get(id, signal)
      return { amount: amountToField(item.amount), date: item.date, description: item.description ?? "", category: item.category, source: "" }
    }
    const item = await incomeService.get(id, signal)
    return { amount: amountToField(item.amount), date: item.date, description: item.description ?? "", category: null, source: item.source }
  })

  const save = async (input: ExpenseInput | IncomeInput) => {
    if (expense) await expenseService.update(id, input as ExpenseInput)
    else await incomeService.update(id, input as IncomeInput)
    toast("Cambios guardados")
    router.back()
  }

  const remove = async () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setDeleting(true)
    setDeleteError(null)
    try {
      if (expense) await expenseService.remove(id)
      else await incomeService.remove(id)
      toast(expense ? "Gasto borrado" : "Ingreso borrado")
      router.back()
    } catch (err) {
      setDeleteError(userMessage(toApiError(err)))
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <Screen back title={expense ? "Gasto" : "Ingreso"}>
      {query.error ? <ErrorState error={query.error} onRetry={query.reload} /> : null}
      {query.isLoading ? (
        <View className="gap-4">
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={48} />
        </View>
      ) : null}
      {query.data ? (
        <>
          <MovementForm kind={expense ? "EXPENSE" : "INCOME"} initial={query.data} submitLabel="Guardar cambios" onSubmit={save} />
          {deleteError ? <Notice tone="error">{deleteError}</Notice> : null}
          <Button
            label={confirming ? `Toca otra vez para borrar el ${noun}` : `Borrar ${noun}`}
            variant="outline"
            loading={deleting}
            onPress={() => void remove()}
          />
        </>
      ) : null}
    </Screen>
  )
}
