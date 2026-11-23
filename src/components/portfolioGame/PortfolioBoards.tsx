import { memo } from "react"
import { View } from "react-native"
import { Text } from "@/components/ui/Text"
import { formatScore, sectorColor } from "@/lib/portfolioGame"
import { formatChange } from "@/lib/updown"
import type { PortfolioGamePlayer, PortfolioResult, PortfolioSector, Weights } from "@/types/portfolioGame"
import { usePalette, useSeriesColors } from "@/theme/palette"

const points = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 })
export const formatGamePoints = (value: number) => points.format(value)

/** El color de cada sector con la paleta del tema. */
export function useSectorColor() {
  const series = useSeriesColors()
  const colors = usePalette()
  return (key: string) => sectorColor(key, series, colors.mutedForeground)
}

/** El reparto como una barra apilada, en el orden de los sectores. */
export function MixBar({ weights, sectors, height = 8 }: { weights: Weights; sectors: PortfolioSector[]; height?: number }) {
  const colorOf = useSectorColor()
  const parts = sectors.filter((sector) => (weights[sector.key] ?? 0) > 0)
  const label = parts.map((sector) => `${sector.name} ${weights[sector.key]} %`).join(", ")
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label || "Sin reparto"} className="flex-row overflow-hidden rounded-full bg-muted" style={{ height }}>
      {parts.map((sector) => (
        <View key={sector.key} style={{ width: `${weights[sector.key]}%`, backgroundColor: colorOf(sector.key) }} />
      ))}
    </View>
  )
}

/** Lo que rindio cada sector en la etapa, en dos columnas. */
export function SectorReturns({ sectors, returns }: { sectors: PortfolioSector[]; returns: Record<string, number> }) {
  const colorOf = useSectorColor()
  const colors = usePalette()
  return (
    <View className="flex-row flex-wrap gap-2">
      {sectors.map((sector) => {
        const value = returns[sector.key] ?? 0
        // Las clases con opacidad (bg-gain/10) no funcionan con los colores en variables: el tinte va directo.
        const tint = value >= 0 ? colors.gain : colors.loss
        return (
          <View key={sector.key} className="w-[48%] grow gap-0.5 rounded-xl border px-3 py-2" style={{ borderColor: `${tint}4d`, backgroundColor: `${tint}1a` }}>
            <View className="flex-row items-center gap-1.5">
              <View className="size-2 rounded-full" style={{ backgroundColor: colorOf(sector.key) }} />
              <Text tone="muted" numberOfLines={1} className="flex-1 text-xs">{sector.name}</Text>
            </View>
            <Text weight="semibold" tone={value >= 0 ? "gain" : "loss"} className="text-base" style={{ fontVariant: ["tabular-nums"] }}>{formatChange(value)}</Text>
          </View>
        )
      })}
    </View>
  )
}

type BoardProps = { ranking: PortfolioGamePlayer[]; sectors: PortfolioSector[]; benchmark: PortfolioResult | null }

/** Ranking con valor, retorno y puntaje; la referencia del S&P 500 va al final, sin puesto. Solo se redibuja si cambia. */
export const PortfolioBoard = memo(
  BoardList,
  (prev, next) => JSON.stringify(prev.ranking) === JSON.stringify(next.ranking) && JSON.stringify(prev.benchmark) === JSON.stringify(next.benchmark),
)

function BoardList({ ranking, sectors, benchmark }: BoardProps) {
  return (
    <View role="list" className="gap-1">
      {ranking.map((player) => (
        <View key={player.id} role="listitem" className={`gap-1.5 rounded-xl px-3 py-2.5 ${player.me ? "bg-accent" : ""}`}>
          <View className="flex-row items-center gap-3">
            <Text weight="semibold" tone="muted" className="w-6 text-sm">{player.rank}</Text>
            <Text weight={player.me ? "semibold" : "regular"} numberOfLines={1} className="flex-1 text-sm">{player.name}{player.me ? " (tú)" : ""}</Text>
            <ResultLine result={player.result} />
          </View>
          {player.weights ? <View className="pl-9"><MixBar weights={player.weights} sectors={sectors} height={5} /></View> : null}
        </View>
      ))}
      {benchmark ? (
        <View className="flex-row items-center gap-3 border-t border-dashed border-border px-3 py-2.5">
          <View className="w-6" />
          <Text tone="muted" className="flex-1 text-sm">Referencia: todo en el S&P 500</Text>
          <ResultLine result={benchmark} />
        </View>
      ) : null}
    </View>
  )
}

function ResultLine({ result }: { result: PortfolioResult | null }) {
  if (!result) return null
  return (
    <View className="items-end">
      <Text weight="semibold" className="text-sm" style={{ fontVariant: ["tabular-nums"] }}>{formatScore(result.score)}</Text>
      <Text className="text-xs" style={{ fontVariant: ["tabular-nums"] }}>
        {points.format(result.value)} · <Text tone={result.returnPercent >= 0 ? "gain" : "loss"} className="text-xs">{formatChange(result.returnPercent)}</Text>
      </Text>
    </View>
  )
}
