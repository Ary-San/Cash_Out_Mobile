import { useState } from "react"
import { Pressable, View } from "react-native"
import { TriangleAlert, X } from "lucide-react-native"
import { toApiError, userMessage } from "@/api/errors"
import { CategoryPicker } from "@/components/movements/CategoryPicker"
import { DateField } from "@/components/movements/DateField"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Field } from "@/components/ui/Field"
import { Segmented } from "@/components/ui/Segmented"
import { Text } from "@/components/ui/Text"
import { useToast } from "@/components/ui/Toast"
import { CONFIDENT, PAYMENT_LABEL, WARNING_TEXT, confirmRequest, formFromDraft, formProblem } from "@/lib/assistant"
import { assistantService } from "@/services/assistantService"
import { usePalette } from "@/theme/palette"
import type { Draft, DraftKind } from "@/types/assistant"

const KINDS: { value: DraftKind; label: string }[] = [
  { value: "EXPENSE", label: "Gasto" },
  { value: "INCOME", label: "Ingreso" },
]

/** Una tarjeta que el usuario revisa antes de guardar: todo se puede cambiar. */
export function DraftCard({ draft, onDone }: { draft: Draft; onDone: (saved: boolean) => void }) {
  const [form, setForm] = useState(() => formFromDraft(draft))
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()
  const colors = usePalette()

  const expense = form.kind === "EXPENSE"
  const problem = formProblem(form)
  const unsure = draft.source !== "USER_RULE" && draft.confidence < CONFIDENT
  const suggested = unsure ? new Set(draft.alternatives.map((option) => option.category)) : undefined

  const save = async () => {
    setTouched(true)
    if (problem) return
    setSaving(true)
    setError(null)
    try {
      const result = await assistantService.confirm(confirmRequest(draft, form))
      toast(`${expense ? "Gasto" : "Ingreso"} guardado${result.learned ? " · la próxima vez lo sugiero así" : ""}`)
      onDone(true)
    } catch (err) {
      setError(userMessage(toApiError(err)))
      setSaving(false)
    }
  }

  return (
    <Card className="gap-4">
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <Segmented
            label="Tipo de movimiento"
            options={KINDS}
            value={form.kind}
            onChange={(kind) => setForm({ ...form, kind, category: form.category ?? draft.category ?? "OTHER" })}
          />
        </View>
        <Pressable role="button" aria-label="Descartar esta tarjeta" onPress={() => onDone(false)} className="size-11 items-center justify-center">
          <X size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {draft.paymentMethod ? (
        <Text tone="muted" className="text-xs">Pagado con {PAYMENT_LABEL[draft.paymentMethod]}</Text>
      ) : null}

      <Field
        label="Descripción"
        placeholder={expense ? "¿En qué fue?" : "¿De dónde vino?"}
        autoCapitalize="sentences"
        maxLength={255}
        value={form.description}
        onChangeText={(description) => setForm({ ...form, description })}
      />
      <Field
        label="Monto (S/)"
        placeholder="0.00"
        keyboardType="decimal-pad"
        value={form.amount}
        onChangeText={(amount) => setForm({ ...form, amount })}
      />
      <DateField value={form.date} onChange={(date) => setForm({ ...form, date })} />
      {expense ? (
        <CategoryPicker value={form.category} onChange={(category) => setForm({ ...form, category })} suggested={suggested} />
      ) : null}

      {draft.warnings.length > 0 ? (
        <View className="gap-1.5">
          {draft.warnings.map((warning) => (
            <View key={warning} className="flex-row items-center gap-2">
              <TriangleAlert size={14} color={colors.accentInk} />
              <Text tone="muted" className="flex-1 text-xs">{WARNING_TEXT[warning]}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {error || (touched && problem) ? (
        <Text role="alert" tone="destructive" className="text-sm">{error ?? problem}</Text>
      ) : null}
      <Button label={`Guardar ${expense ? "gasto" : "ingreso"}`} loading={saving} onPress={() => void save()} />
    </Card>
  )
}

/** Las tarjetas de una frase o una boleta; cada una se va al guardarla o descartarla. */
export function DraftList({ drafts, onSaved }: { drafts: Draft[]; onSaved: () => void }) {
  const [open, setOpen] = useState(() => drafts.map((draft, index) => ({ draft, key: index })))

  return (
    <View aria-label="Movimientos para revisar" className="gap-3">
      {open.map(({ draft, key }) => (
        <DraftCard
          key={key}
          draft={draft}
          onDone={(saved) => {
            setOpen((cards) => cards.filter((card) => card.key !== key))
            if (saved) onSaved()
          }}
        />
      ))}
    </View>
  )
}
