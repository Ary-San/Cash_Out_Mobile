import { useState } from "react"
import { View } from "react-native"
import { toApiError, userMessage } from "@/api/errors"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { Sheet } from "@/components/ui/Sheet"
import { Text } from "@/components/ui/Text"
import { haptics } from "@/lib/haptics"
import { paramsSummary } from "@/lib/projections"
import { projectionService } from "@/services/projectionService"
import type { ProjectionParams } from "@/types/projections"

interface SaveScenarioSheetProps {
  /** El escenario a guardar; null con la hoja cerrada. */
  params: ProjectionParams | null
  /** La meta para la que se planea, si se llego desde una. */
  goal: { id: number; name: string } | null
  onClose: () => void
  onSaved: (name: string) => void
}

/** Ponerle nombre al escenario de la calculadora y guardarlo. */
export function SaveScenarioSheet({ params, goal, onClose, onSaved }: SaveScenarioSheetProps) {
  const [name, setName] = useState("")
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const close = () => {
    setName("")
    setError(undefined)
    onClose()
  }

  const save = async () => {
    const trimmed = name.trim()
    if (!params) return
    if (!trimmed) return setError("Ponle un nombre al escenario.")
    if (trimmed.length > 120) return setError("El nombre no puede tener más de 120 caracteres.")
    setBusy(true)
    try {
      await projectionService.create({ ...params, name: trimmed, savingsGoalId: goal?.id ?? null })
      haptics.success()
      setName("")
      setError(undefined)
      onSaved(trimmed)
    } catch (err) {
      setError(userMessage(toApiError(err)))
    }
    setBusy(false)
  }

  return (
    <Sheet visible={params !== null} onClose={close} locked={busy} title="Guardar escenario">
      <View className="gap-3.5">
        {params ? <Text tone="muted" className="text-[13px] leading-5">{paramsSummary(params)}</Text> : null}
        <Field
          label="Nombre"
          value={name}
          onChangeText={(value) => {
            setName(value)
            setError(undefined)
          }}
          placeholder={goal ? `Plan para ${goal.name}` : "Por ejemplo: depósito a 2 años"}
          maxLength={120}
          error={error}
          returnKeyType="done"
          onSubmitEditing={() => void save()}
        />
        {goal ? <Text tone="muted" className="-mt-1.5 text-xs">Queda asociado a tu meta {goal.name}.</Text> : null}
        <Button label="Guardar" loading={busy} onPress={() => void save()} />
      </View>
    </Sheet>
  )
}
