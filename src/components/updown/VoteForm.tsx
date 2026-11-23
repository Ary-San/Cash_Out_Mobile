import { useState } from "react"
import { Pressable, View } from "react-native"
import { Minus, Plus } from "lucide-react-native"
import { Button } from "@/components/ui/Button"
import { Text } from "@/components/ui/Text"
import { haptics } from "@/lib/haptics"
import { TOUCH_SLOP } from "@/lib/touch"
import { betChips, clampBet, minBet, UPDOWN_CHOICES } from "@/lib/updown"
import type { UpDownChoice, UpDownView } from "@/types/updown"
import { usePalette } from "@/theme/palette"
import { formatPoints } from "./UpDownBoards"

const STEP = 10
/** Los botones −10 y +10: area extra tambien a los lados, el texto del medio no es un boton. */
const STEPPER_SLOP = { top: 8, bottom: 8, left: 6, right: 6 }

/** Elegir sube, igual o baja y cuanto apostar. Un voto por ronda. */
export function VoteForm({ view, onVote, busy }: { view: UpDownView; onVote: (choice: UpDownChoice, bet: number) => void; busy: boolean }) {
  const colors = usePalette()
  const me = view.me!
  const [choice, setChoice] = useState<UpDownChoice | null>(null)
  const [bet, setBet] = useState(() => clampBet(100, me.points, view.minBet))
  const lowest = minBet(me.points, view.minBet)
  const setClamped = (value: number) => setBet(clampBet(value, me.points, view.minBet))

  return (
    <View className="gap-4">
      <View className="gap-2">
        <Text weight="semibold" className="text-base">¿Qué hizo el mes siguiente?</Text>
        <View role="radiogroup" aria-label="Tu predicción" className="flex-row gap-2">
          {UPDOWN_CHOICES.map((option) => {
            const on = choice === option.value
            const tint = option.tone === "gain" ? colors.gain : option.tone === "loss" ? colors.loss : colors.accentInk
            return (
              <Pressable
                key={option.value}
                role="radio"
                aria-checked={on}
                aria-label={option.label}
                onPress={() => {
                  haptics.selection()
                  setChoice(option.value)
                }}
                className={`min-h-20 flex-1 items-center justify-center gap-1 rounded-2xl border-2 ${on ? "bg-muted" : "border-border bg-card"}`}
                style={on ? { borderColor: tint } : undefined}
              >
                <Text tone={option.tone} className="text-2xl">{option.icon}</Text>
                <Text weight="semibold" className="text-sm">{option.label}</Text>
              </Pressable>
            )
          })}
        </View>
        <Text tone="muted" className="text-xs">«Igual» gana si se movió menos de 2 % hacia cualquier lado.</Text>
      </View>

      <View className="gap-2.5">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm">¿Cuánto apuestas?</Text>
          <View className="flex-row items-center gap-1">
            <Pressable hitSlop={STEPPER_SLOP} role="button" aria-label="Apostar 10 menos" disabled={bet <= lowest} onPress={() => setClamped(bet - STEP)} className={`size-9 items-center justify-center rounded-full border border-border ${bet <= lowest ? "opacity-40" : ""}`}>
              <Minus size={16} color={colors.foreground} />
            </Pressable>
            <Text weight="semibold" className="min-w-20 text-center text-base" style={{ fontVariant: ["tabular-nums"] }}>{formatPoints(bet)} pts</Text>
            <Pressable hitSlop={STEPPER_SLOP} role="button" aria-label="Apostar 10 más" disabled={bet >= me.points} onPress={() => setClamped(bet + STEP)} className={`size-9 items-center justify-center rounded-full border border-border ${bet >= me.points ? "opacity-40" : ""}`}>
              <Plus size={16} color={colors.foreground} />
            </Pressable>
          </View>
        </View>
        <View className="flex-row gap-1.5">
          {betChips(me.points, view.minBet).map((chip) => (
            <Pressable
              key={chip.label}
              hitSlop={TOUCH_SLOP}
              role="button"
              onPress={() => setBet(chip.value)}
              className={`min-h-9 flex-1 items-center justify-center rounded-full border ${bet === chip.value ? "border-accent-ink bg-accent" : "border-border"}`}
            >
              <Text weight="medium" className="text-[13px]">{chip.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text tone="muted" className="text-xs">Si aciertas ganas {formatPoints(bet)} pts; si fallas los pierdes. Tienes {formatPoints(me.points)}.</Text>
      </View>

      <Button label={choice ? "Confirmar apuesta" : "Elige una opción"} disabled={!choice} loading={busy} onPress={() => choice && onVote(choice, bet)} />
    </View>
  )
}
