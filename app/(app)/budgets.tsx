import { useState } from "react"
import { router } from "expo-router"
import { toApiError, userMessage } from "@/api/errors"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Field } from "@/components/ui/Field"
import { Screen } from "@/components/ui/Screen"
import { ErrorState, Skeleton } from "@/components/ui/States"
import { Text } from "@/components/ui/Text"
import { useToast } from "@/components/ui/Toast"
import { useApiQuery } from "@/hooks/useApiQuery"
import { CATEGORY_META } from "@/lib/categories"
import { budgetService } from "@/services/budgetService"
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/types/movements"

const AMOUNT = /^\d{1,7}([.,]\d{1,2})?$/

/** Un campo por categoria: con monto crea o cambia el presupuesto, vacio lo quita. */
export default function BudgetsScreen() {
  const toast = useToast()
  const query = useApiQuery(["budgets"], (signal) => budgetService.list(signal))
  const [values, setValues] = useState<Partial<Record<ExpenseCategory, string>>>({})
  const [saving, setSaving] = useState(false)
  const [invalid, setInvalid] = useState<ExpenseCategory | null>(null)

  const initial = (category: ExpenseCategory) => {
    const found = query.data?.find((b) => b.category === category)
    return found ? String(found.limit) : ""
  }
  const value = (category: ExpenseCategory) => values[category] ?? initial(category)

  const save = async () => {
    const wrong = EXPENSE_CATEGORIES.find((c) => value(c).trim() && !AMOUNT.test(value(c).trim()))
    setInvalid(wrong ?? null)
    if (wrong) return
    setSaving(true)
    try {
      for (const category of EXPENSE_CATEGORIES) {
        const text = value(category).trim().replace(",", ".")
        const had = initial(category) !== ""
        if (text && Number(text) > 0) {
          if (Number(text) !== Number(initial(category))) await budgetService.set(category, Number(text))
        } else if (had) {
          await budgetService.remove(category)
        }
      }
      toast("Presupuestos guardados.")
      router.back()
    } catch (err) {
      toast(userMessage(toApiError(err)))
    }
    setSaving(false)
  }

  return (
    <Screen title="Presupuestos" subtitle="Cuánto quieres gastar al mes en cada categoría" back>
      {query.error ? <ErrorState error={query.error} onRetry={query.reload} /> : null}
      {query.isLoading ? <Skeleton height={320} /> : null}
      {query.data ? (
        <>
          <Card className="gap-3 p-5">
            <Text tone="muted" className="text-sm leading-5">Deja vacío lo que no quieras limitar. Te avisamos al 80 % y al 100 %.</Text>
            {EXPENSE_CATEGORIES.map((category) => (
              <Field
                key={category}
                label={`${CATEGORY_META[category].label} (S/)`}
                placeholder="Sin tope"
                keyboardType="decimal-pad"
                value={value(category)}
                onChangeText={(text) => setValues((prev) => ({ ...prev, [category]: text }))}
                error={invalid === category ? "Revisa el monto: hasta 2 decimales." : undefined}
              />
            ))}
          </Card>
          <Button label="Guardar" loading={saving} onPress={() => void save()} />
        </>
      ) : null}
    </Screen>
  )
}
