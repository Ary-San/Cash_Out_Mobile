import { View } from "react-native"
import { CircleCheck, CircleX } from "lucide-react-native"
import { Button } from "@/components/ui/Button"
import { Text } from "@/components/ui/Text"
import { usePalette } from "@/theme/palette"

/** "Pregunta 3 de 8 · 2 aciertos", con la barra de avance. */
export function RoundHeader({ unit, index, total, answered, correct }: { unit: string; index: number; total: number; answered: boolean; correct: number }) {
  const done = index + (answered ? 1 : 0)
  return (
    <View className="gap-2">
      <View className="flex-row justify-between">
        <Text tone="muted" className="text-sm">{unit} {index + 1} de {total}</Text>
        <Text tone="muted" className="text-sm" style={{ fontVariant: ["tabular-nums"] }}>{correct} {correct === 1 ? "acierto" : "aciertos"}</Text>
      </View>
      <View accessible accessibilityRole="progressbar" accessibilityLabel={`Avance: ${done} de ${total}`} className="h-1.5 overflow-hidden rounded-full bg-muted">
        <View className="h-full rounded-full bg-accent-ink" style={{ width: `${(done / total) * 100}%` }} />
      </View>
    </View>
  )
}

interface RoundFeedbackProps {
  /** null mientras no se responde. */
  result: { right: boolean; verdict: string; explanation: string } | null
  nextLabel: string
  onNext: () => void
}

/** Si acertaste, por que, y el boton para seguir. Se anuncia al lector de pantalla apenas aparece. */
export function RoundFeedback({ result, nextLabel, onNext }: RoundFeedbackProps) {
  const colors = usePalette()
  if (!result) return null
  const tint = result.right ? colors.gain : colors.loss
  const Icon = result.right ? CircleCheck : CircleX
  return (
    <>
      <View accessibilityLiveRegion="polite" role="alert" className="flex-row gap-3 rounded-xl border p-3.5" style={{ borderColor: `${tint}66`, backgroundColor: `${tint}0f` }}>
        <Icon size={20} color={tint} />
        <View className="flex-1 gap-1">
          <Text weight="semibold" className="text-sm leading-5">{result.verdict}</Text>
          <Text tone="muted" className="text-[13px] leading-5">{result.explanation}</Text>
        </View>
      </View>
      <Button label={nextLabel} onPress={onNext} />
    </>
  )
}
