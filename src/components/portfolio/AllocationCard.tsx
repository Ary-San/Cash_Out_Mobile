import { View } from "react-native"
import Svg, { Circle } from "react-native-svg"
import { Card } from "@/components/ui/Card"
import { Skeleton } from "@/components/ui/States"
import { Text } from "@/components/ui/Text"
import { formatTokenAmount } from "@/lib/market"
import type { Position } from "@/types/market"
import { usePalette } from "@/theme/palette"

const SIZE = 120
const RADIUS = 48
const STROKE = 14
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
// Hueco entre porciones, en fraccion de la vuelta.
const GAP = 0.008

interface AllocationCardProps {
  tokens: number | undefined
  positions: Position[] | undefined
  colorOf: (assetId: number) => string
}

/** Todo lo que tienes en fichas: lo libre y lo invertido en cada activo. */
export function AllocationCard({ tokens, positions, colorOf }: AllocationCardProps) {
  const colors = usePalette()
  if (tokens === undefined || !positions) return <Skeleton height={190} />

  const raw = [
    { key: "libres", label: "Fichas libres", value: tokens, color: colors.mutedForeground },
    ...positions
      .filter((position) => (position.marketValue ?? 0) > 0)
      .sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0))
      .map((position) => ({ key: String(position.assetId), label: position.symbol, value: position.marketValue ?? 0, color: colorOf(position.assetId) })),
  ]
  const total = raw.reduce((sum, slice) => sum + slice.value, 0)
  let start = 0
  const slices = raw.map((slice) => {
    const share = total > 0 ? slice.value / total : 0
    const out = { ...slice, share, start }
    start += share
    return out
  })
  const biggest = slices.slice(1).sort((a, b) => b.value - a.value)[0]

  return (
    <Card className="gap-3">
      <Text weight="semibold" className="text-[15px]">Cómo se reparte</Text>
      <View className="flex-row items-center gap-5">
        <View style={{ width: SIZE, height: SIZE }}>
          <Svg width={SIZE} height={SIZE} style={{ transform: [{ rotate: "-90deg" }] }}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke={colors.muted} strokeWidth={STROKE} />
            {slices
              .filter((slice) => slice.share > 0)
              .map((slice) => {
                const length = Math.max(slice.share - GAP, 0.002) * CIRCUMFERENCE
                return (
                  <Circle
                    key={slice.key}
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={STROKE}
                    strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                    strokeDashoffset={-slice.start * CIRCUMFERENCE}
                  />
                )
              })}
          </Svg>
          <View className="absolute inset-0 items-center justify-center">
            <Text tone="muted" className="text-[11px]">Total</Text>
            <Text weight="semibold" className="text-sm">{formatTokenAmount(total)}</Text>
          </View>
        </View>
        <View className="flex-1 gap-1.5">
          {slices.map((slice) => (
            <View key={slice.key} className="flex-row items-center gap-2">
              <View className="size-2.5 rounded-sm" style={{ backgroundColor: slice.color }} />
              <Text numberOfLines={1} className="flex-1 text-[13px]">{slice.label}</Text>
              <Text tone="muted" className="text-[13px]">{Math.round(slice.share * 100)} %</Text>
            </View>
          ))}
        </View>
      </View>
      <Text tone="muted" className="text-[13px] leading-5">
        {biggest
          ? `${biggest.label} es tu mayor inversión: ${Math.round(biggest.share * 100)} % de todo lo que tienes. Tienes ${Math.round(slices[0].share * 100)} % en fichas sin invertir.`
          : "Todavía no inviertes: todas tus fichas están libres."}
      </Text>
    </Card>
  )
}
