import { useState } from "react"
import { Pressable, View } from "react-native"
import { toApiError, userMessage } from "@/api/errors"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { Notice } from "@/components/ui/Notice"
import { Sheet } from "@/components/ui/Sheet"
import { Text } from "@/components/ui/Text"
import { formatSoles } from "@/lib/format"
import { goalService } from "@/services/goalService"
import type { SavingsGoal } from "@/types/goals"

interface ContributeSheetProps {
  goal: SavingsGoal
  available: number
  color: string
  visible: boolean
  onClose: () => void
  /** Se llama con lo aportado cuando el backend lo acepta. */
  onDone: (amount: number) => void
}

const parse = (text: string) => Math.round(Number(text.replace(",", ".")) * 100) / 100

/** Aportar con las mismas reglas que el backend: mayor que cero, sin pasar lo que falta ni el disponible. */
export function ContributeSheet({ goal, available, color, visible, onClose, onDone }: ContributeSheetProps) {
  const [text, setText] = useState("")
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const remaining = Math.max(Math.round((goal.targetAmount - goal.accumulatedAmount) * 100) / 100, 0)
  const amount = parse(text)
  let error: string | null = null
  if (text.trim() && !(amount > 0)) error = "Escribe un monto mayor que cero."
  else if (amount > available) error = `Supera tu disponible de ${formatSoles(available)}.`
  else if (amount > remaining) error = `Supera lo que falta para la meta (${formatSoles(remaining)}).`
  const valid = Boolean(text.trim()) && !error
  const before = goal.accumulatedAmount / goal.targetAmount
  const after = valid ? Math.min(1, (goal.accumulatedAmount + amount) / goal.targetAmount) : before

  const chips = [
    { label: "S/ 20", value: 20 },
    { label: "S/ 50", value: 50 },
    { label: "S/ 100", value: 100 },
    { label: "Lo que falta", value: Math.min(remaining, available) },
  ]

  const submit = async () => {
    if (!valid || saving) return
    setSaving(true)
    setServerError(null)
    try {
      await goalService.contribute(goal.id, amount)
      setText("")
      onDone(amount)
    } catch (err) {
      setServerError(userMessage(toApiError(err)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} locked={saving} title={`Aportar a ${goal.name}`}>
      <Text tone="muted" className="-mt-2 text-[13px]">
        Disponible {formatSoles(available)} · Falta {formatSoles(remaining)}
      </Text>
      <Field
        label="Monto (S/)"
        placeholder="Ej. 50"
        keyboardType="decimal-pad"
        value={text}
        onChangeText={setText}
        error={error ?? undefined}
        autoFocus
      />
      <View className="flex-row gap-2">
        {chips.map((chip) => {
          const on = Boolean(text.trim()) && amount === chip.value
          return (
            <Pressable
              key={chip.label}
              role="button"
              onPress={() => setText(String(chip.value))}
              className={`h-11 flex-1 items-center justify-center rounded-full border ${on ? "border-accent-ink bg-accent" : "border-border"}`}
            >
              <Text weight="medium" className="text-[13px]">{chip.label}</Text>
            </Pressable>
          )
        })}
      </View>
      <View className="gap-2">
        <View className="h-2.5 overflow-hidden rounded-full bg-muted">
          <View className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${after * 100}%`, backgroundColor: color, opacity: 0.35 }} />
          <View className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${before * 100}%`, backgroundColor: color }} />
        </View>
        {!error ? (
          <Text tone="muted" className="text-[13px]">
            {valid
              ? after >= 1
                ? "¡Con esto cumples la meta!"
                : `Quedarías en ${Math.floor(after * 100)} %. Tu disponible baja a ${formatSoles(available - amount)}.`
              : "Lo que apartes deja de contar como disponible, pero sigue siendo tu dinero."}
          </Text>
        ) : null}
      </View>
      {serverError ? <Notice tone="error">{serverError}</Notice> : null}
      <Button
        label={saving ? "Aportando…" : valid ? `Aportar ${formatSoles(amount)}` : "Aportar"}
        loading={saving}
        disabled={!valid}
        onPress={() => void submit()}
      />
    </Sheet>
  )
}
