import { View } from "react-native"
import Svg, { Line, Polyline } from "react-native-svg"
import { ArrowDown, ArrowUp } from "lucide-react-native"
import { Card } from "@/components/ui/Card"
import { Text } from "@/components/ui/Text"
import { formatSoles } from "@/lib/format"
import type { MonthPace } from "@/lib/monthPace"
import { usePalette } from "@/theme/palette"

const WIDTH = 100
const HEIGHT = 72

function points(values: number[], days: number, max: number): string {
  return values
    .map((value, i) => `${(i / Math.max(days - 1, 1)) * WIDTH},${HEIGHT - 4 - (value / max) * (HEIGHT - 8)}`)
    .join(" ")
}

/** ¿Voy mejor o peor que el mes pasado? Primero la frase; la linea es apoyo. */
const capitalize = (text: string) => text[0].toUpperCase() + text.slice(1)

export function MonthCard({ pace, monthName, previousName }: { pace: MonthPace; monthName: string; previousName: string }) {
  const colors = usePalette()
  const less = pace.change !== null && pace.change <= 0
  const diff = Math.abs(pace.spent - pace.previousToDate)
  const max = Math.max(...pace.previousCumulative, ...pace.cumulative, 1)
  const days = pace.previousCumulative.length

  const sentence =
    pace.change === null
      ? `Llevas ${formatSoles(pace.spent)} gastados. En ${previousName} no registraste gastos para comparar.`
      : `Llevas ${formatSoles(pace.spent)} gastados: ${formatSoles(diff)} ${less ? "menos" : "más"} que ${previousName} a esta fecha.`

  return (
    <Card className="gap-3 p-5">
      <View className="flex-row items-center justify-between">
        <Text weight="semibold" className="text-[15px]">Este mes</Text>
        {pace.change !== null ? (
          <View
            className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
            style={{ backgroundColor: `${less ? colors.income : colors.warning}1A` }}
          >
            {less ? <ArrowDown size={12} color={colors.income} /> : <ArrowUp size={12} color={colors.warning} />}
            <Text weight="semibold" tone={less ? "income" : "warning"} className="text-xs">
              {Math.round(Math.abs(pace.change))} % {less ? "menos" : "más"}
            </Text>
          </View>
        ) : null}
      </View>
      <Text className="text-[15px] leading-6">{sentence}</Text>
      {/* Sin gastos el mes pasado no hay contra que comparar: la linea plana confundiria. */}
      {pace.change !== null && days > 1 ? (
        <>
          <Svg
            width="100%"
            height={HEIGHT}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={`Gasto acumulado de este mes comparado con ${previousName}`}
          >
            <Line x1="0" y1={HEIGHT - 4} x2={WIDTH} y2={HEIGHT - 4} stroke={colors.border} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <Polyline
              points={points(pace.previousCumulative, days, max)}
              fill="none"
              stroke={colors.mutedForeground}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
            <Polyline
              points={points(pace.cumulative, days, max)}
              fill="none"
              stroke={colors.expense}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </Svg>
          <View className="flex-row gap-4">
            <View className="flex-row items-center gap-1.5">
              <View className="h-[3px] w-3.5 rounded-full bg-expense" />
              <Text tone="muted" className="text-xs">{capitalize(monthName)}</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="w-3.5 border-t-2 border-dashed border-muted-foreground" />
              <Text tone="muted" className="text-xs">{capitalize(previousName)} completo</Text>
            </View>
          </View>
        </>
      ) : null}
    </Card>
  )
}
