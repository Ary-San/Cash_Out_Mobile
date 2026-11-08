import { useState } from "react"
import { Pressable, View } from "react-native"
import Animated, { FadeIn } from "react-native-reanimated"
import { LineChart } from "@/components/portfolio/LineChart"
import { Card } from "@/components/ui/Card"
import { Skeleton } from "@/components/ui/States"
import { Text } from "@/components/ui/Text"
import { parseIsoDate } from "@/lib/dates"
import { changeTone, formatSigned, formatSignedPercent, formatTokenAmount } from "@/lib/market"
import type { PortfolioDay, PortfolioNow } from "@/lib/portfolioHistory"
import { usePalette } from "@/theme/palette"

type MetricKey = keyof PortfolioNow

const METRICS: { key: MetricKey; label: string; signed: boolean }[] = [
  { key: "value", label: "Valor de tus inversiones", signed: false },
  { key: "unrealized", label: "Ganancia o pérdida sin realizar", signed: true },
  { key: "realized", label: "Ganancia o pérdida realizada", signed: true },
]

const dayMonth = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short" })
const shortDay = (iso: string) => dayMonth.format(parseIsoDate(iso)).replace(".", "")

interface MetricsCardProps {
  now: PortfolioNow | undefined
  /** Los ultimos 30 dias; undefined mientras se arman. */
  history: PortfolioDay[] | undefined
}

/** Un solo grafico de 30 dias: se elige la cifra abajo y se desliza el dedo para ver cada dia. */
export function MetricsCard({ now, history }: MetricsCardProps) {
  const colors = usePalette()
  const [metric, setMetric] = useState<MetricKey>("value")
  const [day, setDay] = useState<number | null>(null)

  const selected = METRICS.find((m) => m.key === metric)!
  const values = history?.map((d) => d[metric])
  const current = values ? values[day ?? values.length - 1] : now?.[metric]
  const first = values?.[0]
  const show = (value: number, signed: boolean) => (signed ? formatSigned(value) : formatTokenAmount(value))

  let change = ""
  if (current !== undefined && first !== undefined) {
    const delta = current - first
    const tail = day === null ? "en 30 días" : `desde el ${shortDay(history![0].date)}`
    change = Math.abs(delta) < 0.005
      ? `sin cambios ${tail}`
      : `${formatSigned(delta)} fichas${Math.abs(first) > 0.005 ? ` (${formatSignedPercent((delta / Math.abs(first)) * 100)})` : ""} ${tail}`
  }
  const rose = values ? values[values.length - 1] - values[0] >= -0.004 : true

  return (
    <Card className="gap-3 p-0 py-4">
      <View className="flex-row items-baseline justify-between px-4">
        <Text tone="muted" className="text-[11px] uppercase tracking-widest">Últimos 30 días</Text>
        <Text aria-live="polite" weight="medium" tone="muted" className="text-xs">
          {day === null || !history ? "Hoy" : `Al ${shortDay(history[day].date)}`}
        </Text>
      </View>

      <View className="gap-0.5 px-4">
        <Text tone="muted" className="text-[13px]">{selected.label}</Text>
        {current === undefined ? (
          <Skeleton width={160} height={34} />
        ) : (
          <Text weight="semibold" tone={selected.signed ? changeTone(current) : "default"} className="text-[30px] leading-9">
            {show(current, selected.signed)} <Text weight="medium" tone="muted" className="text-sm">fichas</Text>
          </Text>
        )}
        <Text weight="medium" tone={current !== undefined && first !== undefined ? changeTone(current - first) : "muted"} className="min-h-[18px] text-[13px]">
          {change}
        </Text>
      </View>

      <View className="mt-6 px-4">
        {values && history ? (
          <Animated.View key={metric} entering={FadeIn.duration(300)}>
            <LineChart
              height={150}
              lines={[{ values, color: rose ? colors.gain : colors.loss, area: true }]}
              guide={{ value: values[0], label: `Inicio ${show(values[0], selected.signed)}` }}
              extremes={{ top: `Máx. ${show(Math.max(...values), selected.signed)}`, bottom: `Mín. ${show(Math.min(...values), selected.signed)}` }}
              index={day}
              onScrub={setDay}
              tip={day === null ? undefined : `${shortDay(history[day].date)} · ${show(values[day], selected.signed)} fichas`}
              accessibilityLabel={`${selected.label} en los últimos 30 días: de ${show(values[0], selected.signed)} a ${show(values[values.length - 1], selected.signed)} fichas. Desliza para ver cada día.`}
            />
          </Animated.View>
        ) : (
          <Skeleton height={150} />
        )}
        <View className="mt-1.5 flex-row justify-between">
          <Text tone="muted" className="text-[11px]">{history ? shortDay(history[0].date) : ""}</Text>
          <Text tone="muted" className="text-[11px]">Hoy</Text>
        </View>
      </View>

      <View role="radiogroup" aria-label="Qué cifra ver en el gráfico" className="gap-1.5 px-4">
        {METRICS.map((m) => {
          const on = m.key === metric
          const series = history?.map((d) => d[m.key])
          const last = series ? series[series.length - 1] : now?.[m.key]
          const delta = series ? series[series.length - 1] - series[0] : undefined
          return (
            <Pressable
              key={m.key}
              role="radio"
              aria-checked={on}
              onPress={() => {
                setMetric(m.key)
                setDay(null)
              }}
              className={`min-h-[52px] flex-row items-center gap-2.5 rounded-2xl border-[1.5px] px-3.5 py-2 ${on ? "border-accent-ink bg-accent" : "border-border"}`}
            >
              <View className={`size-2.5 rounded-full border-2 ${on ? "border-accent-ink bg-accent-ink" : "border-border"}`} />
              <View className="flex-1">
                <Text weight="medium" className="text-[13px]">{m.label}</Text>
                <Text tone={changeTone(delta)} className="text-xs">
                  {delta === undefined ? " " : Math.abs(delta) < 0.005 ? "sin cambios en 30 días" : `${formatSigned(delta)} en 30 días`}
                </Text>
              </View>
              <Text weight="semibold" tone={m.signed ? changeTone(last) : "default"} className="text-base">
                {last === undefined ? "—" : show(last, m.signed)}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </Card>
  )
}
