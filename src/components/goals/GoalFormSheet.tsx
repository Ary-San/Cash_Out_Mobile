import { useState } from "react"
import { Pressable, View } from "react-native"
import { toApiError, userMessage } from "@/api/errors"
import { DeadlinePicker } from "@/components/goals/DeadlinePicker"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { Notice } from "@/components/ui/Notice"
import { Sheet } from "@/components/ui/Sheet"
import { Text } from "@/components/ui/Text"
import { formatDate, formatSoles } from "@/lib/format"
import { monthlyPlan, monthsFromToday, validateGoalForm, type GoalFormErrors } from "@/lib/goals"
import { goalService } from "@/services/goalService"
import type { SavingsGoal } from "@/types/goals"

/** 0 = mantener la fecha actual (al editar); -1 = otra fecha, sin tope. */
type Term = 0 | 3 | 6 | 12 | -1

interface GoalFormSheetProps {
  visible: boolean
  goals: SavingsGoal[]
  /** Con una meta, edita; sin ella, crea. */
  editing?: SavingsGoal
  onClose: () => void
  onSaved: (goal: SavingsGoal) => void
}

export function GoalFormSheet({ visible, goals, editing, onClose, onSaved }: GoalFormSheetProps) {
  const [name, setName] = useState(editing?.name ?? "")
  const [target, setTarget] = useState(editing ? String(editing.targetAmount) : "")
  const [term, setTerm] = useState<Term>(editing ? 0 : 6)
  const [customDate, setCustomDate] = useState("")
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [serverErrors, setServerErrors] = useState<GoalFormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const deadline = term === 0 ? editing!.deadline : term === -1 ? customDate : monthsFromToday(term)
  const errors = { ...validateGoalForm({ name, target, deadline }, goals, editing), ...serverErrors }
  // El nombre repetido se avisa al escribir; lo demas, al intentar guardar.
  const shown: GoalFormErrors = touched ? errors : { name: errors.name?.startsWith("Ya tienes") ? errors.name : undefined }
  const ok = Object.values(errors).every((e) => !e)
  const amount = Number(target.replace(",", "."))
  const plan = ok ? monthlyPlan(editing ? Math.max(amount - editing.accumulatedAmount, 0) : amount, deadline) : null

  const terms: { value: Term; label: string; date: string }[] = [
    ...(editing ? [{ value: 0 as Term, label: "Mantener", date: formatDate(editing.deadline) }] : []),
    ...([3, 6, 12] as const).map((m) => ({ value: m as Term, label: m === 12 ? "1 año" : `${m} meses`, date: formatDate(monthsFromToday(m)) })),
    { value: -1, label: "Otra fecha", date: customDate ? formatDate(customDate) : "Sin límite" },
  ]

  const submit = async () => {
    setTouched(true)
    if (!ok || saving) return
    setSaving(true)
    setFormError(null)
    try {
      const input = { name: name.trim(), targetAmount: amount, deadline }
      onSaved(editing ? await goalService.update(editing.id, input) : await goalService.create(input))
    } catch (err) {
      const error = toApiError(err)
      if (error.status === 409) setServerErrors({ name: error.serverMessage })
      else setFormError(userMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} locked={saving} title={editing ? "Editar meta" : "Nueva meta"}>
      <Field
        label="¿Para qué ahorras?"
        placeholder="Bicicleta, viaje, curso…"
        autoCapitalize="sentences"
        maxLength={120}
        value={name}
        onChangeText={(value) => {
          setName(value)
          setServerErrors({})
        }}
        error={shown.name}
      />
      <Field label="¿Cuánto necesitas? (S/)" placeholder="Ej. 1200" keyboardType="decimal-pad" value={target} onChangeText={setTarget} error={shown.target} />
      <View role="radiogroup" aria-label="Plazo" className="gap-1.5">
        <Text weight="medium" className="text-sm">¿Para cuándo?</Text>
        <View className="flex-row flex-wrap gap-2">
          {terms.map((t) => {
            const on = term === t.value
            return (
              <Pressable
                key={t.value}
                role="radio"
                aria-checked={on}
                onPress={() => setTerm(t.value)}
                className={`h-[52px] items-center justify-center rounded-[14px] border-[1.5px] ${on ? "border-accent-ink bg-accent" : "border-border"}`}
                style={{ width: "31.5%" }}
              >
                <Text weight="semibold" className="text-[13px]">{t.label}</Text>
                <Text tone="muted" className="text-[11px]">{t.date}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>
      {term === -1 ? <DeadlinePicker value={customDate} onChange={setCustomDate} error={shown.deadline} /> : null}
      <Text tone="muted" className="text-sm leading-5">
        {plan
          ? `Para llegar el ${formatDate(deadline)}, aparta ${formatSoles(plan.perMonth)} al mes${plan.months > 12 ? ` durante ${plan.months} meses` : ""}.`
          : "Te diremos cuánto apartar cada mes para llegar a tiempo."}
      </Text>
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      <Button label={editing ? "Guardar cambios" : "Crear meta"} loading={saving} onPress={() => void submit()} />
    </Sheet>
  )
}
