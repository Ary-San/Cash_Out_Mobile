import { useState } from "react"
import { View } from "react-native"
import { Field } from "@/components/ui/Field"
import { Segmented } from "@/components/ui/Segmented"
import { Text } from "@/components/ui/Text"
import { todayIso, yesterdayIso } from "@/lib/dates"

type Choice = "today" | "yesterday" | "other"

const CHOICES: { value: Choice; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "other", label: "Otra" },
]

function choiceOf(date: string): Choice {
  if (date === todayIso()) return "today"
  return date === yesterdayIso() ? "yesterday" : "other"
}

/**
 * Casi todo se anota hoy o ayer: esas van con un toque. Otra fecha se escribe
 * como 2026-10-15, que es lo que guarda el backend.
 */
export function DateField({ value, onChange, error }: { value: string; onChange: (date: string) => void; error?: string }) {
  const [choice, setChoice] = useState<Choice>(() => choiceOf(value))

  const pick = (next: Choice) => {
    setChoice(next)
    if (next === "today") onChange(todayIso())
    if (next === "yesterday") onChange(yesterdayIso())
  }

  return (
    <View className="gap-1.5">
      <Text weight="medium" className="text-sm">Fecha</Text>
      <Segmented label="Fecha" options={CHOICES} value={choice} onChange={pick} />
      {choice === "other" ? (
        <Field
          label="Otra fecha"
          placeholder="AAAA-MM-DD"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          value={value}
          onChangeText={onChange}
          error={error}
        />
      ) : error ? (
        <Text tone="destructive" className="text-sm">{error}</Text>
      ) : null}
    </View>
  )
}
