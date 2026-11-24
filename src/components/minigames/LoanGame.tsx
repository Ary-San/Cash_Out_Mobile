import { useState } from "react"
import { AccessibilityInfo, View } from "react-native"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Text } from "@/components/ui/Text"
import type { LoanRound } from "@/games/types"
import { formatSoles } from "@/lib/format"
import { haptics } from "@/lib/haptics"
import { installment, loanTotal, type LoanOffer } from "@/lib/loans"
import { usePalette } from "@/theme/palette"
import { RoundFeedback, RoundHeader } from "./RoundParts"

const percent = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 })
const LETTERS = "ABCDEFGH"

function extrasText(offer: LoanOffer): string {
  const parts = [offer.fee > 0 && `comisión de ${formatSoles(offer.fee)}`, offer.monthlyInsurance > 0 && `seguro de ${formatSoles(offer.monthlyInsurance)} al mes`].filter(Boolean)
  return parts.length === 0 ? "Sin costos extra" : parts.join(" y ").replace(/^./, (c) => c.toUpperCase())
}

/** Cada ronda: tres ofertas para la misma necesidad; gana quien elige la que cuesta menos en total. */
interface LoanGameProps {
  rounds: LoanRound[]
  onFinish: (correct: number) => void
  /** Se eligio: la pantalla baja a la explicacion. */
  onAnswered?: () => void
  /** Ronda nueva: la pantalla vuelve arriba. */
  onNext?: () => void
}

export function LoanGame({ rounds, onFinish, onAnswered, onNext }: LoanGameProps) {
  const colors = usePalette()
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)

  const round = rounds[index]
  const totals = round.offers.map((offer) => loanTotal(round.principal, offer))
  const cheapest = totals.indexOf(Math.min(...totals))
  const answered = picked !== null
  const last = index === rounds.length - 1

  const pick = (offer: number) => {
    setPicked(offer)
    if (offer === cheapest) {
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
    AccessibilityInfo.announceForAccessibility(`Ronda ${index + 2} de ${rounds.length}: necesitas ${formatSoles(rounds[index + 1].principal)} para ${rounds[index + 1].need}`)
  }

  return (
    <View className="gap-4">
      <RoundHeader unit="Ronda" index={index} total={rounds.length} answered={answered} correct={correct} />
      <Text accessibilityRole="header" weight="semibold" className="text-base leading-6">
        Necesitas {formatSoles(round.principal)} para {round.need}. ¿Qué préstamo te cuesta menos?
      </Text>
      {round.offers.map((offer, i) => {
        const letter = LETTERS[i]
        const total = totals[i]
        const tint = answered && i === cheapest ? colors.gain : answered && i === picked ? colors.loss : null
        return (
          <Card key={offer.lender} className="gap-2.5" style={tint ? { borderColor: tint, backgroundColor: `${tint}0d` } : undefined}>
            <View>
              <Text tone="muted" className="text-xs">Oferta {letter}</Text>
              <Text weight="semibold" className="text-base">{offer.lender}</Text>
            </View>
            <View className="gap-1">
              <Row label="TEA" value={`${percent.format(offer.tea * 100)} %`} />
              <Row label="Plazo" value={`${offer.months} meses`} />
              <Row label="Cuota" value={formatSoles(installment(round.principal, offer.tea, offer.months))} strong />
            </View>
            <Text tone="muted" className="text-[13px]">{extrasText(offer)}</Text>
            {answered ? (
              <View className="gap-0.5 border-t border-border pt-2.5">
                <Text tone="muted" className="text-xs">Total a pagar</Text>
                <Text weight="semibold" className="text-lg" style={{ fontVariant: ["tabular-nums"] }}>{formatSoles(total)}</Text>
                <Text tone="muted" className="text-xs">{formatSoles(total - round.principal)} en intereses y costos</Text>
                <View className="flex-row flex-wrap gap-1.5 pt-1">
                  {i === cheapest ? <Text weight="medium" tone="gain" className="text-xs">La más barata</Text> : null}
                  {i === picked ? <Text weight="medium" className="text-xs">· Tu elección</Text> : null}
                </View>
              </View>
            ) : (
              <Button label={`Elegir la oferta ${letter}`} variant="outline" onPress={() => pick(i)} />
            )}
          </Card>
        )
      })}
      <RoundFeedback
        result={
          answered
            ? {
                right: picked === cheapest,
                verdict:
                  picked === cheapest
                    ? "¡Bien elegido! Es la que menos te cuesta."
                    : `La más barata era la oferta ${LETTERS[cheapest]}: te ahorraba ${formatSoles(totals[picked] - totals[cheapest])}.`,
                explanation: round.explanation,
              }
            : null
        }
        nextLabel={last ? "Ver resultado" : "Siguiente ronda"}
        onNext={next}
      />
    </View>
  )
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="flex-row justify-between">
      <Text tone="muted" className="text-sm">{label}</Text>
      <Text weight={strong ? "semibold" : "regular"} className="text-sm" style={{ fontVariant: ["tabular-nums"] }}>{value}</Text>
    </View>
  )
}
