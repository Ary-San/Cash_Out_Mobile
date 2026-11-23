import { useState } from "react"
import { View } from "react-native"
import Svg, { Line, Path } from "react-native-svg"
import { Text } from "@/components/ui/Text"
import { formatSignedPercent } from "@/lib/market"
import type { RaceRacer } from "@/types/race"
import { usePalette } from "@/theme/palette"

/** El precio de la moneda misteriosa, que avanza de izquierda a derecha hasta el final de la carrera. */
export function RaceChart({ prices, totalSteps, height }: { prices: number[]; totalSteps: number; height: number }) {
  const colors = usePalette()
  const [width, setWidth] = useState(0)
  const last = prices[prices.length - 1] ?? 100
  const tint = last >= 100 ? colors.gain : colors.loss
  const low = Math.min(100, ...prices)
  const high = Math.max(100, ...prices)
  const pad = Math.max((high - low) * 0.12, 1)
  const x = (i: number) => (i / Math.max(totalSteps - 1, 1)) * width
  const y = (v: number) => height - ((v - (low - pad)) / (high - low + 2 * pad)) * height
  const line = prices.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ")
  const lastX = x(Math.max(prices.length - 1, 0))

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Precio de la moneda misteriosa: ${last.toFixed(2)}, ${formatSignedPercent(last - 100)} desde el inicio.`}
      style={{ height }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          {/* La linea del precio de salida: arriba se gana, abajo se pierde. */}
          <Line x1={0} x2={width} y1={y(100)} y2={y(100)} stroke={colors.mutedForeground} strokeWidth={1} strokeDasharray="4 6" />
          {prices.length > 1 ? (
            <>
              <Path d={`${line} L${lastX} ${height} L0 ${height} Z`} fill={tint} fillOpacity={0.12} />
              <Path d={line} fill="none" stroke={tint} strokeWidth={2.2} />
            </>
          ) : null}
        </Svg>
      ) : null}
    </View>
  )
}

/** El ranking de la carrera, del primero al ultimo; opcional, cuanto tiene invertido cada uno. */
export function RaceRanking({ ranking, showInvested = false, limit }: { ranking: RaceRacer[]; showInvested?: boolean; limit?: number }) {
  const top = limit ? ranking.slice(0, limit) : ranking
  // Fuera del top, tu fila va al final igual: arriba dice "#8 de 12", y aca te encuentras.
  const mine = ranking.find((racer) => racer.me)
  const shown = mine && !top.includes(mine) ? [...top, mine] : top
  return (
    <View role="list" className="gap-1">
      {shown.map((racer) => (
        <View
          key={racer.id}
          role="listitem"
          accessible
          accessibilityLabel={`Puesto ${racer.rank}: ${racer.name}${racer.me ? " (tú)" : ""}, ${formatSignedPercent(racer.returnPercent)}`}
          className={`min-h-11 flex-row items-center gap-3 rounded-xl px-3 py-1.5 ${racer.me ? "bg-accent" : ""}`}
        >
          <Text weight="semibold" tone="muted" className="w-6 text-sm">{racer.rank}</Text>
          <View className="flex-1">
            <Text weight={racer.me ? "semibold" : "regular"} numberOfLines={1} className="text-sm">{racer.name}{racer.me ? " (tú)" : ""}</Text>
            {showInvested ? <Text tone="muted" className="text-xs">Invertido {Math.round(racer.investedPercent)} %</Text> : null}
          </View>
          <Text weight="medium" tone={racer.returnPercent >= 0 ? "gain" : "loss"} className="text-sm" style={{ fontVariant: ["tabular-nums"] }}>
            {formatSignedPercent(racer.returnPercent)}
          </Text>
        </View>
      ))}
    </View>
  )
}
