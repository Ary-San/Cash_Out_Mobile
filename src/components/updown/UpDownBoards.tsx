import { memo } from "react"
import { View } from "react-native"
import { Card } from "@/components/ui/Card"
import { Text } from "@/components/ui/Text"
import { choiceMeta, formatChange, UPDOWN_CHOICES } from "@/lib/updown"
import type { UpDownOption, UpDownPlayer, UpDownReveal } from "@/types/updown"
import { usePalette } from "@/theme/palette"

const points = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 })
export const formatPoints = (value: number) => points.format(value)

type RankingProps = { ranking: UpDownPlayer[]; showDelta?: boolean; limit?: number }

/** El ranking de la sala; despues de revelar, cuanto gano o perdio cada uno en la ronda. Solo se redibuja si cambia. */
export const UpDownRanking = memo(RankingList, (prev, next) => prev.showDelta === next.showDelta && prev.limit === next.limit && JSON.stringify(prev.ranking) === JSON.stringify(next.ranking))

function RankingList({ ranking, showDelta = false, limit }: RankingProps) {
  const shown = limit ? ranking.slice(0, limit) : ranking
  return (
    <View role="list" className="gap-1">
      {shown.map((player) => (
        <View key={player.id} role="listitem" className={`min-h-11 flex-row items-center gap-3 rounded-xl px-3 ${player.me ? "bg-accent" : ""}`}>
          <Text weight="semibold" tone="muted" className="w-6 text-sm" style={{ fontVariant: ["tabular-nums"] }}>{player.rank}</Text>
          <Text weight={player.me ? "semibold" : "regular"} numberOfLines={1} className="flex-1 text-sm">
            {player.name}{player.me ? " (tú)" : ""}
          </Text>
          {showDelta && player.voted ? (
            <Text tone={player.delta > 0 ? "gain" : "loss"} className="text-xs" style={{ fontVariant: ["tabular-nums"] }}>
              {player.delta > 0 ? "+" : "−"}{points.format(Math.abs(player.delta))}
            </Text>
          ) : null}
          <Text weight="medium" className="text-sm" style={{ fontVariant: ["tabular-nums"] }}>{points.format(player.points)} pts</Text>
        </View>
      ))}
    </View>
  )
}

type TallyProps = { options: UpDownOption[]; answered: number; winner?: string }

/** Como vota la sala: cuantos eligieron cada opcion. La ganadora se marca al revelar. Solo se redibuja si cambia. */
export const VoteTally = memo(TallyBars, (prev, next) => prev.answered === next.answered && prev.winner === next.winner && JSON.stringify(prev.options) === JSON.stringify(next.options))

function TallyBars({ options, answered, winner }: TallyProps) {
  const colors = usePalette()
  return (
    <View className="gap-2.5">
      {UPDOWN_CHOICES.map((choice) => {
        const option = options.find((o) => o.choice === choice.value)
        const votes = option?.votes ?? 0
        const share = answered > 0 ? votes / answered : 0
        const tint = choice.tone === "gain" ? colors.gain : choice.tone === "loss" ? colors.loss : colors.accentInk
        return (
          <View key={choice.value} className="gap-1">
            <View className="flex-row justify-between">
              <Text weight={winner === choice.value ? "semibold" : "regular"} className="text-sm">
                {choice.icon} {choice.label}{winner === choice.value ? " · ganó" : ""}
              </Text>
              <Text tone="muted" className="text-sm" style={{ fontVariant: ["tabular-nums"] }}>{votes}</Text>
            </View>
            <View className="h-2 overflow-hidden rounded-full bg-muted">
              <View style={{ width: `${share * 100}%`, backgroundColor: tint }} className="h-full rounded-full" />
            </View>
          </View>
        )
      })}
    </View>
  )
}

/** Lo que paso de verdad: el activo, cuanto se movio y por que. */
export function LessonCard({ reveal }: { reveal: UpDownReveal }) {
  const meta = choiceMeta(reveal.outcome)
  return (
    <Card className="gap-1.5">
      <Text tone="muted" className="text-xs">Era</Text>
      <View className="flex-row items-baseline justify-between gap-3">
        <Text weight="semibold" className="flex-1 text-base">{reveal.name}</Text>
        <Text weight="semibold" tone={meta.tone} className="text-base" style={{ fontVariant: ["tabular-nums"] }}>
          {meta.icon} {formatChange(reveal.changePercent)}
        </Text>
      </View>
      <Text className="text-sm leading-5">{reveal.lesson}</Text>
    </Card>
  )
}
