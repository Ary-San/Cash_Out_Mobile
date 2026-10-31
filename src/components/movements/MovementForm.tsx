import { useState } from "react"
import { View } from "react-native"
import { toApiError, userMessage } from "@/api/errors"
import { CategoryPicker } from "@/components/movements/CategoryPicker"
import { DateField } from "@/components/movements/DateField"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { Notice } from "@/components/ui/Notice"
import { todayIso } from "@/lib/dates"
import { expenseFormSchema, incomeFormSchema } from "@/lib/movementValidation"
import type { ExpenseCategory, ExpenseInput, IncomeInput } from "@/types/movements"

export interface MovementValues {
  amount: string
  date: string
  description: string
  category: ExpenseCategory | null
  source: string
}

type Errors = Partial<Record<keyof MovementValues, string>>

interface MovementFormProps {
  kind: "EXPENSE" | "INCOME"
  initial?: MovementValues
  submitLabel: string
  onSubmit: (input: ExpenseInput | IncomeInput) => Promise<void>
}

/** Crear o editar un gasto o un ingreso. Valida lo mismo que el backend antes de mandarlo. */
export function MovementForm({ kind, initial, submitLabel, onSubmit }: MovementFormProps) {
  // La fecha de hoy se calcula al abrir el formulario, no al cargar el archivo.
  const [values, setValues] = useState<MovementValues>(
    () => initial ?? { amount: "", date: todayIso(), description: "", category: null, source: "" },
  )
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const expense = kind === "EXPENSE"

  const set = (change: Partial<MovementValues>) => setValues((previous) => ({ ...previous, ...change }))

  const submit = async () => {
    // Sin categoria el valor es null, y Zod lo cortaria con su mensaje generico en ingles: "" llega a "Elige una categoría".
    const parsed = expense
      ? expenseFormSchema.safeParse({ ...values, category: values.category ?? "" })
      : incomeFormSchema.safeParse(values)
    if (!parsed.success) {
      // Un campo vacio falla dos reglas ("ingresa el monto" y el formato): se muestra la primera.
      const found: Errors = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof MovementValues
        found[field] ??= issue.message
      }
      setErrors(found)
      return
    }
    setErrors({})
    setFormError(null)
    setSaving(true)
    try {
      await onSubmit(parsed.data)
    } catch (err) {
      const error = toApiError(err)
      if (Object.keys(error.fieldErrors).length > 0) setErrors(error.fieldErrors)
      else setFormError(userMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <View className="gap-5">
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      <Field
        label="Monto (S/)"
        placeholder="0.00"
        keyboardType="decimal-pad"
        value={values.amount}
        onChangeText={(amount) => set({ amount })}
        error={errors.amount}
      />
      {expense ? (
        <CategoryPicker value={values.category} onChange={(category) => set({ category })} error={errors.category} />
      ) : (
        <Field
          label="¿De dónde vino?"
          placeholder="Sueldo, freelance, mi tía…"
          autoCapitalize="sentences"
          maxLength={100}
          value={values.source}
          onChangeText={(source) => set({ source })}
          error={errors.source}
        />
      )}
      <DateField value={values.date} onChange={(date) => set({ date })} error={errors.date} />
      <Field
        label="Descripción (opcional)"
        placeholder={expense ? "¿En qué fue?" : "Algún detalle"}
        autoCapitalize="sentences"
        maxLength={255}
        value={values.description}
        onChangeText={(description) => set({ description })}
        error={errors.description}
      />
      <Button label={submitLabel} loading={saving} onPress={() => void submit()} />
    </View>
  )
}
