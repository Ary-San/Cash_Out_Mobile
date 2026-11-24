import { useState } from "react"
import { AccessibilityInfo, Pressable, View } from "react-native"
import { CircleCheck, CircleX } from "lucide-react-native"
import { Card } from "@/components/ui/Card"
import { Text } from "@/components/ui/Text"
import type { ChoiceQuestion } from "@/games/types"
import { haptics } from "@/lib/haptics"
import { usePalette } from "@/theme/palette"
import { RoundFeedback, RoundHeader } from "./RoundParts"

interface ChoiceGameProps {
  questions: ChoiceQuestion[]
  /** "Pregunta" en una trivia, "Situación" en el quiz. */
  unit: string
  onFinish: (correct: number) => void
  /** Se respondio: la pantalla baja a la explicacion. */
  onAnswered?: () => void
  /** Pregunta nueva: la pantalla vuelve arriba. */
  onNext?: () => void
}

/** Trivia y quiz: una pregunta a la vez, con la explicacion apenas se responde. */
export function ChoiceGame({ questions, unit, onFinish, onAnswered, onNext }: ChoiceGameProps) {
  const colors = usePalette()
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)

  const question = questions[index]
  const answered = picked !== null
  const last = index === questions.length - 1

  const pick = (option: number) => {
    setPicked(option)
    if (option === question.answer) {
      setCorrect((count) => count + 1)
      haptics.success()
    } else {
      haptics.warning()
    }
    onAnswered?.()
  }

  const next = () => {
    if (last) return onFinish(correct)
    setIndex(index + 1)
    setPicked(null)
    onNext?.()
    // El foco del lector estaba en "Siguiente", que desaparece: se anuncia lo nuevo.
    AccessibilityInfo.announceForAccessibility(`${unit} ${index + 2} de ${questions.length}: ${questions[index + 1].prompt}`)
  }

  return (
    <View className="gap-4">
      <RoundHeader unit={unit} index={index} total={questions.length} answered={answered} correct={correct} />
      <Card className="gap-3.5">
        <Text accessibilityRole="header" weight="semibold" className="text-base leading-6">{question.prompt}</Text>
        <View className="gap-2">
          {question.options.map((option, i) => {
            const isAnswer = i === question.answer
            const isPicked = i === picked
            const tint = answered && isAnswer ? colors.gain : answered && isPicked ? colors.loss : null
            return (
              <Pressable
                key={option}
                role="button"
                aria-disabled={answered}
                disabled={answered}
                onPress={() => pick(i)}
                className={`min-h-12 flex-row items-center gap-2 rounded-xl border px-3.5 py-2.5 ${tint ? "" : "border-border active:bg-muted"}`}
                style={tint ? { borderColor: tint, backgroundColor: `${tint}14` } : undefined}
              >
                <Text className="flex-1 text-sm leading-5">{option}</Text>
                {answered && isAnswer ? (
                  <View className="flex-row items-center gap-1">
                    <CircleCheck size={14} color={colors.gain} />
                    <Text weight="medium" tone="gain" className="text-xs">Correcta</Text>
                  </View>
                ) : answered && isPicked ? (
                  <View className="flex-row items-center gap-1">
                    <CircleX size={14} color={colors.loss} />
                    <Text weight="medium" tone="loss" className="text-xs">Tu respuesta</Text>
                  </View>
                ) : null}
              </Pressable>
            )
          })}
        </View>
        <RoundFeedback
          result={
            answered
              ? {
                  right: picked === question.answer,
                  verdict: picked === question.answer ? "¡Correcto!" : `No era esa. La respuesta es «${question.options[question.answer]}».`,
                  explanation: question.explanation,
                }
              : null
          }
          nextLabel={last ? "Ver resultado" : `Siguiente ${unit.toLowerCase()}`}
          onNext={next}
        />
      </Card>
    </View>
  )
}
