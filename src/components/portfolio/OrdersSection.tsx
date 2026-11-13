import { useState } from "react"
import { Pressable, TextInput, View } from "react-native"
import { ListOrdered, Search } from "lucide-react-native"
import type { OrderTarget } from "@/components/portfolio/OrderSheet"
import { ReceiptSheet } from "@/components/portfolio/ReceiptSheet"
import { Card } from "@/components/ui/Card"
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States"
import { Text } from "@/components/ui/Text"
import { useApiQuery } from "@/hooks/useApiQuery"
import { ORDER_SIDE_LABEL, ORDER_STATUS_LABEL, formatQuantity, formatSigned, formatTokenAmount, formatUsd } from "@/lib/market"
import {
  ORDER_KINDS,
  ORDER_PERIODS,
  dayTitle,
  groupByDay,
  inPeriod,
  matchesKind,
  newestFirst,
  orderMetrics,
  signedTokens,
  type OrderKind,
  type OrderMetric,
  type OrderPeriod,
} from "@/lib/orders"
import { parseServerDateTime } from "@/lib/format"
import { marketService } from "@/services/marketService"
import { portfolioService } from "@/services/portfolioService"
import type { Position, TradeOrder } from "@/types/market"
import { usePalette } from "@/theme/palette"
import { TOUCH_SLOP } from "@/lib/touch"

const STEP = 30

const META: Record<OrderMetric["key"], { label: string; tone: "default" | "gain" | "warning" }> = {
  executed: { label: "Órdenes ejecutadas", tone: "default" },
  invested: { label: "Fichas invertidas", tone: "default" },
  received: { label: "Fichas recibidas", tone: "gain" },
  rejected: { label: "Rechazadas", tone: "warning" },
}

function note(metric: OrderMetric): string {
  if (metric.key === "executed") return `${metric.count} enviadas en el periodo`
  if (metric.key === "invested") return `en ${metric.count} ${metric.count === 1 ? "compra" : "compras"}`
  if (metric.key === "received") return `en ${metric.count} ${metric.count === 1 ? "venta" : "ventas"}`
  return metric.count ? "el motivo está en cada una" : "ninguna en el periodo"
}

interface OrdersSectionProps {
  version: number
  positions: Position[] | undefined
  onTrade: (target: OrderTarget) => void
}

export function OrdersSection({ version, positions, onTrade }: OrdersSectionProps) {
  const colors = usePalette()
  const [period, setPeriod] = useState<OrderPeriod>("30d")
  const [kind, setKind] = useState<OrderKind>("todas")
  const [text, setText] = useState("")
  const [limit, setLimit] = useState(STEP)
  const [picked, setPicked] = useState<TradeOrder | null>(null)

  const orders = useApiQuery(["orders-all", version], (signal) => portfolioService.allOrders(signal).then(newestFirst))
  const assetIds = [...new Set(orders.data?.map((order) => order.assetId))].sort((a, b) => a - b)
  const assets = useApiQuery(["order-assets", assetIds], (signal) =>
    Promise.all(assetIds.map((id) => marketService.getAsset(id, signal).catch(() => null))),
  )
  const names = Object.fromEntries((assets.data ?? []).flatMap((asset) => (asset ? [[asset.id, asset.name]] : [])))

  if (orders.error && !orders.data) return <ErrorState error={orders.error} onRetry={orders.reload} />
  if (orders.data && orders.data.length === 0) {
    return (
      <EmptyState
        icon={ListOrdered}
        title="Todavía no hiciste órdenes"
        message="Cada compra o venta queda registrada aquí, también las que no se pudieron ejecutar y por qué."
      />
    )
  }

  const search = text.trim().toUpperCase()
  const periodOrders = orders.data && inPeriod(orders.data, period)
  const metrics = periodOrders && orderMetrics(periodOrders, period)
  const visible = periodOrders?.filter((order) => matchesKind(order, kind) && (!search || order.symbol.includes(search)))
  const days = visible && groupByDay(visible.slice(0, limit))

  const repeat = (order: TradeOrder) => {
    setPicked(null)
    // iOS no abre un Modal mientras otro se esta cerrando: la hoja de orden espera a que baje el comprobante.
    setTimeout(
      () =>
        onTrade({
          assetId: order.assetId,
          symbol: order.symbol,
          name: names[order.assetId] ?? order.symbol,
          side: order.side,
          held: positions?.find((position) => position.assetId === order.assetId)?.quantity ?? 0,
        }),
      350,
    )
  }

  return (
    <View className="gap-4">
      <Card className="gap-3 px-0 pb-0">
        <View className="flex-row items-center justify-between gap-2 px-4">
          <Text tone="muted" numberOfLines={1} className="flex-1 text-[11px] uppercase tracking-widest">Tus órdenes</Text>
          <View role="radiogroup" aria-label="Periodo" className="w-[190px] flex-row rounded-full bg-muted p-1">
            {ORDER_PERIODS.map((option) => (
              <Pressable
                hitSlop={TOUCH_SLOP}
                key={option.value}
                role="radio"
                aria-checked={period === option.value}
                onPress={() => {
                  setPeriod(option.value)
                  setLimit(STEP)
                }}
                className={`min-h-8 flex-1 items-center justify-center rounded-full ${period === option.value ? "bg-card" : ""}`}
              >
                <Text weight={period === option.value ? "semibold" : "regular"} tone={period === option.value ? "default" : "muted"} className="text-xs">
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View className="flex-row flex-wrap">
          {(metrics ?? [undefined, undefined, undefined, undefined]).map((metric, i) => {
            const max = metric ? Math.max(...metric.bars) : 0
            const meta = metric ? META[metric.key] : undefined
            const barColor = meta?.tone === "gain" ? colors.gain : meta?.tone === "warning" ? colors.warning : colors.accentInk
            return (
              <View key={metric?.key ?? i} className={`w-1/2 border-border px-4 pb-3.5 pt-2.5 ${i > 1 ? "border-t" : ""} ${i % 2 ? "border-l" : ""}`}>
                <Text tone="muted" className="text-xs">{meta?.label ?? " "}</Text>
                {metric && meta ? (
                  <Text weight="semibold" tone={metric.value === 0 ? "default" : meta.tone} className="mt-0.5 text-xl">
                    {metric.key === "invested" || metric.key === "received" ? formatTokenAmount(metric.value) : metric.value}
                  </Text>
                ) : (
                  <Skeleton width={80} height={26} />
                )}
                <View aria-hidden className="mt-2 h-6 flex-row items-end gap-[3px]">
                  {(metric?.bars ?? Array<number>(7).fill(0)).map((value, j) => (
                    <View
                      key={j}
                      className="flex-1 rounded-[3px]"
                      style={{ height: max > 0 && value > 0 ? `${Math.max((value / max) * 100, 8)}%` : 2, backgroundColor: value > 0 ? barColor : colors.border }}
                    />
                  ))}
                </View>
                <Text tone="muted" className="mt-1.5 text-[11px]">{metric ? note(metric) : " "}</Text>
              </View>
            )
          })}
        </View>
      </Card>

      <Card className="overflow-hidden p-0">
        <View className="gap-2.5 p-4 pb-3">
          <View role="group" aria-label="Tipo de orden" className="flex-row flex-wrap gap-1.5">
            {ORDER_KINDS.map((option) => {
              const on = kind === option.value
              const count = periodOrders?.filter((order) => matchesKind(order, option.value)).length
              return (
                <Pressable
                  hitSlop={TOUCH_SLOP}
                  key={option.value}
                  role="button"
                  aria-pressed={on}
                  onPress={() => {
                    setKind(option.value)
                    setLimit(STEP)
                  }}
                  className={`min-h-9 flex-row items-center gap-1.5 rounded-full border px-3 ${on ? "border-accent-ink bg-accent" : "border-border bg-card"}`}
                >
                  <Text weight={on ? "semibold" : "regular"} className="text-[13px]">{option.label}</Text>
                  {count !== undefined ? <Text tone="muted" className="text-[13px]">{count}</Text> : null}
                </Pressable>
              )
            })}
          </View>
          <View className="min-h-11 flex-row items-center gap-2 rounded-xl border border-input bg-card px-3.5">
            <Search size={16} color={colors.mutedForeground} />
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Buscar por símbolo"
              placeholderTextColor={colors.mutedForeground}
              accessibilityLabel="Buscar por símbolo"
              autoCapitalize="characters"
              autoCorrect={false}
              className="flex-1 font-sans text-sm text-foreground"
            />
          </View>
        </View>

        {!days ? (
          <View className="gap-3 border-t border-border p-4"><Skeleton height={20} /><Skeleton height={20} /></View>
        ) : days.length === 0 ? (
          <View className="items-center gap-2.5 border-t border-border px-4 py-7">
            <Text weight="semibold">No hay órdenes con estos filtros</Text>
            <Pressable
              hitSlop={TOUCH_SLOP}
              role="button"
              onPress={() => {
                setPeriod("todo")
                setKind("todas")
                setText("")
              }}
              className="min-h-10 justify-center rounded-full border border-border px-4 active:opacity-70"
            >
              <Text weight="medium" className="text-sm">Ver todas</Text>
            </Pressable>
          </View>
        ) : (
          days.map((day) => (
            <View key={day.day}>
              <View className="flex-row justify-between bg-muted px-4 py-2">
                <Text weight="semibold" className="text-xs">{dayTitle(day.day)}</Text>
                <Text weight="medium" tone={day.net !== null && day.net > 0 ? "gain" : "muted"} className="text-xs">
                  {day.net === null ? "—" : `${formatSigned(day.net)} fichas`}
                </Text>
              </View>
              {day.orders.map((order, i) => (
                <OrderRow key={order.id} order={order} first={i === 0} onPress={setPicked} />
              ))}
            </View>
          ))
        )}
        {visible && visible.length > limit ? (
          <View className="border-t border-border p-3">
            <Pressable hitSlop={TOUCH_SLOP} role="button" onPress={() => setLimit((n) => n + STEP)} className="min-h-10 items-center justify-center rounded-full border border-border active:opacity-70">
              <Text weight="medium" className="text-sm">Ver más órdenes</Text>
            </Pressable>
          </View>
        ) : null}
      </Card>

      <ReceiptSheet order={picked} name={picked ? names[picked.assetId] : undefined} onClose={() => setPicked(null)} onRepeat={repeat} />
    </View>
  )
}

// onPress recibe la orden: la lista pasa siempre la misma funcion y "Ver mas" no vuelve a dibujar las filas que ya estaban.
function OrderRow({ order, first, onPress }: { order: TradeOrder; first: boolean; onPress: (order: TradeOrder) => void }) {
  const colors = usePalette()
  const tokens = signedTokens(order)
  const done = order.status === "EXECUTED"
  const time = parseServerDateTime(order.createdAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false })

  return (
    <Pressable
      role="button"
      aria-label={`${ORDER_SIDE_LABEL[order.side]} de ${order.symbol}, ${ORDER_STATUS_LABEL[order.status].toLowerCase()}. Ver comprobante`}
      onPress={() => onPress(order)}
      className={`gap-1.5 px-4 py-3 active:bg-muted ${first ? "" : "border-t border-border"}`}
    >
      <View className="flex-row items-center gap-2.5">
        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: order.side === "BUY" ? colors.accent : colors.muted }}>
          <Text weight="semibold" tone={order.side === "BUY" ? "accent" : "default"} className="text-[11px]">{ORDER_SIDE_LABEL[order.side]}</Text>
        </View>
        <Text weight="semibold" className="flex-1 text-[15px]">
          {order.symbol} <Text tone="muted" className="text-[13px]">{formatQuantity(order.quantity)}</Text>
        </Text>
        <Text weight="semibold" tone={tokens !== null && tokens > 0 ? "gain" : "default"} className="text-[15px]">
          {tokens === null ? "—" : formatSigned(tokens)}
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: done ? `${colors.gain}22` : `${colors.warning}22` }}>
          <Text weight="semibold" tone={done ? "gain" : "warning"} className="text-[11px]">{ORDER_STATUS_LABEL[order.status]}</Text>
        </View>
        <Text tone="muted" className="flex-1 text-xs">{done ? `a ${formatUsd(order.executionPrice)}` : "Sin mover fichas"}</Text>
        <Text tone="muted" className="text-xs">{time}</Text>
      </View>
    </Pressable>
  )
}
