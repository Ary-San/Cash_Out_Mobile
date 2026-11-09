import { useState } from "react"
import { Pressable, View } from "react-native"
import { useLocalSearchParams } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Star, TrendingUp } from "lucide-react-native"
import { LineChart, type ChartLine } from "@/components/portfolio/LineChart"
import { NewsReaderSheet } from "@/components/portfolio/NewsReaderSheet"
import { OrderSheet, type OrderTarget } from "@/components/portfolio/OrderSheet"
import { ReceiptSheet } from "@/components/portfolio/ReceiptSheet"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Notice } from "@/components/ui/Notice"
import { Screen } from "@/components/ui/Screen"
import { ErrorState, Skeleton } from "@/components/ui/States"
import { Text } from "@/components/ui/Text"
import { useApiQuery } from "@/hooks/useApiQuery"
import { useLivePrices } from "@/hooks/useLivePrices"
import { usePolling } from "@/hooks/usePolling"
import { useSavedNews } from "@/hooks/useSavedNews"
import { useWatchlist } from "@/hooks/useWatchlist"
import { CHART_RANGES, changeOf, inRange, returnsByRange, yearStats, type ChartRange } from "@/lib/assetStats"
import { formatDateTime } from "@/lib/format"
import {
  ASSET_TYPE_LABEL,
  ORDER_SIDE_LABEL,
  ORDER_STATUS_LABEL,
  changeTone,
  displayName,
  formatQuantity,
  formatSigned,
  formatSignedPercent,
  formatTokens,
  formatUsd,
  returnPercent,
  unitOf,
} from "@/lib/market"
import { formatNewsStamp, sourceLabel } from "@/lib/news"
import { newestFirst } from "@/lib/orders"
import { marketService } from "@/services/marketService"
import { newsService } from "@/services/newsService"
import { portfolioService } from "@/services/portfolioService"
import type { OrderSide, TradeOrder } from "@/types/market"
import type { NewsItem } from "@/types/news"
import { usePalette } from "@/theme/palette"
import { TOUCH_SLOP } from "@/lib/touch"

const BENCHMARK = "SPY"
type ChartView = ChartRange | "LIVE"

export default function AssetScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const colors = usePalette()
  const insets = useSafeAreaInsets()
  const watchlist = useWatchlist()
  const saved = useSavedNews()
  const [view, setView] = useState<ChartView | null>(null)
  const [compare, setCompare] = useState(false)
  const [target, setTarget] = useState<OrderTarget | null>(null)
  const [receipt, setReceipt] = useState<TradeOrder | null>(null)
  const [reading, setReading] = useState<NewsItem | null>(null)
  const [version, setVersion] = useState(0)

  const asset = useApiQuery(["asset", id], (signal) => marketService.getAsset(id, signal))
  const quote = useApiQuery(["quote", id], (signal) => marketService.getQuote(id, signal))
  const history = useApiQuery(["history", id], (signal) => marketService.getPriceHistory(id, signal))
  const portfolio = useApiQuery(["portfolio", version], (signal) => portfolioService.get(signal))
  const orders = useApiQuery(["asset-orders", id, version], (signal) =>
    portfolioService.allOrders(signal).then((list) => newestFirst(list.filter((order) => order.assetId === id))),
  )
  const isCrypto = asset.data?.type === "CRYPTO"
  const benchmark = useApiQuery(["benchmark", asset.data?.symbol ?? null], async (signal) => {
    if (!asset.data || isCrypto || asset.data.symbol === BENCHMARK) return null
    const page = await marketService.searchAssets({ search: BENCHMARK, page: 0, size: 5 }, signal)
    const found = page.content.find((item) => item.symbol === BENCHMARK)
    return found ? marketService.getPriceHistory(found.id, signal) : null
  })
  const news = useApiQuery(["asset-news", asset.data?.symbol ?? null], (signal) =>
    asset.data && asset.data.source !== "MANUAL" ? newsService.feed({ scope: "market", symbol: asset.data.symbol }, signal) : Promise.resolve(null),
  )
  usePolling(quote.reload, 15_000, Boolean(asset.data))
  // La cripto abre en vivo; las acciones, en el ultimo mes.
  const current: ChartView = view ?? (isCrypto ? "LIVE" : "1M")
  const live = useLivePrices(id, Boolean(isCrypto) && current === "LIVE")

  if (!asset.data) {
    return (
      <Screen back title="Activo">
        {asset.error ? (
          asset.error.status === 404 ? <Notice tone="error">No encontramos este activo.</Notice> : <ErrorState error={asset.error} onRetry={asset.reload} />
        ) : (
          <Skeleton height={220} />
        )}
      </Screen>
    )
  }

  const data = asset.data
  const position = portfolio.data?.positions.find((p) => p.assetId === data.id)
  const held = position?.quantity ?? 0
  const livePrice = isCrypto && current === "LIVE" ? live.points[live.points.length - 1]?.price : undefined
  const previousClose = quote.data?.previousClose ?? null
  const price = livePrice ?? quote.data?.price
  const change = livePrice !== undefined && previousClose ? ((livePrice - previousClose) / previousClose) * 100 : (quote.data?.changePercent ?? null)
  const favorite = watchlist.isFavorite(data.id)
  const name = displayName(data.name)
  const comparable = !isCrypto && data.symbol !== BENCHMARK

  // ---- Grafico ----
  let lines: ChartLine[] = []
  let legend: { label: string; value: number | null; color: string }[] = []
  let caption = ""
  let guide: { value: number; label: string } | undefined
  if (current === "LIVE") {
    const values = live.points.map((point) => point.price)
    const delta = values.length > 1 ? ((values[values.length - 1] - values[0]) / values[0]) * 100 : null
    if (values.length > 1) lines = [{ values, color: (delta ?? 0) >= 0 ? colors.gain : colors.loss, area: true }]
    legend = [{ label: data.symbol.replace(/-USD$/, ""), value: delta, color: lines[0]?.color ?? colors.gain }]
    caption = live.status === "live" ? `Últimos ${Math.max(1, Math.round(values.length / 60))} min` : live.status === "connecting" ? "Conectando…" : "Reconectando…"
  } else if (history.data) {
    const slice = inRange(history.data, current)
    const values = slice.map((point) => point.closePrice)
    const own = changeOf(slice)
    const range = CHART_RANGES.find((r) => r.key === current)!
    caption = range.description
    if (compare && comparable && benchmark.data) {
      const bench = inRange(benchmark.data, current).map((point) => point.closePrice)
      const pct = (list: number[]) => list.map((v) => (v / list[0] - 1) * 100)
      lines = [
        { values: pct(values), color: colors.accentInk },
        { values: pct(bench), color: colors.mutedForeground, dashed: true },
      ]
      legend = [
        { label: data.symbol, value: own, color: colors.accentInk },
        { label: "S&P 500", value: changeOf(inRange(benchmark.data, current)), color: colors.mutedForeground },
      ]
    } else if (values.length > 1) {
      lines = [{ values, color: (own ?? 0) >= 0 ? colors.gain : colors.loss, area: true }]
      legend = [{ label: data.symbol, value: own, color: lines[0].color }]
      const min = Math.min(...values)
      const max = Math.max(...values)
      if (position && position.averageCost > min * 0.8 && position.averageCost < max * 1.2) {
        guide = { value: position.averageCost, label: `Tu costo ${formatUsd(position.averageCost)}` }
      }
    }
  }
  const returns = history.data ? returnsByRange(history.data, benchmark.data ?? undefined) : undefined
  const stats = history.data ? yearStats(history.data, price) : null

  const trade = (side: OrderSide) => setTarget({ assetId: data.id, symbol: data.symbol, name: data.name, side, held })
  const onDone = () => {
    setTarget(null)
    setVersion((n) => n + 1)
    quote.reload()
  }
  const ranges: { key: ChartView; label: string }[] = [...(isCrypto ? [{ key: "LIVE" as const, label: "En vivo" }] : []), ...CHART_RANGES.map((r) => ({ key: r.key, label: r.label }))]

  return (
    <View className="flex-1">
      <Screen
        back
        title={name}
        onRefresh={() => {
          quote.reload()
          history.reload()
          setVersion((n) => n + 1)
        }}
        refreshing={quote.isRefreshing}
        action={
          <Pressable
            role="button"
            aria-pressed={favorite}
            aria-label={favorite ? `Quitar ${data.symbol} de favoritos` : `Agregar ${data.symbol} a favoritos`}
            onPress={() => void watchlist.toggle(data)}
            className="size-11 items-center justify-center rounded-full border border-border"
          >
            <Star size={20} color={favorite ? colors.accentInk : colors.mutedForeground} fill={favorite ? colors.accentInk : "transparent"} />
          </Pressable>
        }
      >
        <View className="-mt-2 gap-2.5">
          <View className="flex-row flex-wrap items-center gap-1.5">
            <Text weight="medium" className="text-xs">{data.symbol}</Text>
            <Badge label={ASSET_TYPE_LABEL[data.type]} />
            {data.exchange ? <Badge label={data.exchange} /> : null}
            {!data.active ? <Badge label="Ya no se opera" /> : null}
            <View className="flex-row items-center gap-1.5">
              <View className="size-[7px] rounded-full" style={{ backgroundColor: colors.gain }} />
              <Text tone="muted" className="text-xs">
                {livePrice !== undefined ? "En vivo · Coinbase, cada segundo" : quote.data ? `Se actualiza cada 15 s · ${formatDateTime(quote.data.updatedAt)}` : "Se actualiza cada 15 s"}
              </Text>
            </View>
          </View>
          {quote.data && price !== undefined ? (
            <View>
              <Text weight="medium" className="text-[34px] leading-10">{formatUsd(price)}</Text>
              <Text className="text-sm">
                <Text tone={changeTone(change)}>{formatSignedPercent(change)} {isCrypto ? "en 24 h" : "hoy"}</Text>
                {previousClose !== null && !isCrypto ? <Text tone="muted"> · cierre anterior {formatUsd(previousClose)}</Text> : null}
              </Text>
            </View>
          ) : quote.error ? (
            <Text tone="destructive" className="text-sm">Sin precio por ahora.</Text>
          ) : (
            <Skeleton width={180} height={40} />
          )}
        </View>

        <Card className="gap-3 px-3.5">
          <View className="flex-row flex-wrap items-center justify-between gap-2">
            <View className="flex-row flex-wrap gap-3">
              {legend.map((item) => (
                <View key={item.label} className="flex-row items-center gap-1.5">
                  <View className="h-[3px] w-3 rounded-sm" style={{ backgroundColor: item.color }} />
                  <Text weight="semibold" className="text-[13px]">{item.label}</Text>
                  <Text weight="semibold" tone={changeTone(item.value)} className="text-[13px]">{formatSignedPercent(item.value)}</Text>
                </View>
              ))}
            </View>
            <Text tone="muted" className="text-xs">{caption}</Text>
          </View>
          {lines.length > 0 ? (
            <View className="mt-3">
              <LineChart
                key={`${current}-${compare}`}
                height={170}
                lines={lines}
                guide={guide}
                minSpan={current === "LIVE" ? 0.0002 : 0.01}
                accessibilityLabel={`${data.symbol} ${caption}: ${formatSignedPercent(legend[0]?.value)}`}
              />
            </View>
          ) : history.error && current !== "LIVE" ? (
            <ErrorState error={history.error} onRetry={history.reload} />
          ) : (
            <Skeleton height={170} />
          )}
          <View role="radiogroup" aria-label="Rango del gráfico" className="flex-row rounded-full bg-muted p-1">
            {ranges.map((range) => {
              const on = current === range.key
              return (
                <Pressable hitSlop={TOUCH_SLOP} key={range.key} role="radio" aria-checked={on} onPress={() => setView(range.key)} className={`min-h-9 flex-1 items-center justify-center rounded-full ${on ? "bg-card" : ""}`}>
                  <Text weight={on ? "semibold" : "regular"} tone={on ? "default" : "muted"} className="text-xs">{range.label}</Text>
                </Pressable>
              )
            })}
          </View>
          {comparable && current !== "LIVE" ? (
            <Pressable
              hitSlop={TOUCH_SLOP}
              role="button"
              aria-pressed={compare}
              onPress={() => setCompare(!compare)}
              className={`min-h-9 flex-row items-center gap-1.5 self-start rounded-full border px-3 ${compare ? "border-accent-ink bg-accent" : "border-border"}`}
            >
              <TrendingUp size={14} color={colors.foreground} />
              <Text weight={compare ? "semibold" : "regular"} className="text-[13px]">{compare ? "vs S&P 500 · quitar" : "Comparar con S&P 500"}</Text>
            </Pressable>
          ) : null}
          {compare && comparable && current !== "LIVE" ? (
            <Text tone="muted" className="text-xs leading-4">Las dos líneas parten de 0 %: compara cuánto subió cada una, no su precio.</Text>
          ) : null}
        </Card>

        <Card className="gap-2.5">
          <Text weight="semibold" className="text-[15px]">Rendimiento</Text>
          {returns ? (
            <View className="flex-row flex-wrap justify-between gap-y-2">
              {returns.map((item) => {
                const on = current === item.range
                return (
                  <Pressable
                    key={item.range}
                    role="button"
                    aria-pressed={on}
                    onPress={() => setView(item.range)}
                    className={`w-[31.5%] items-center gap-0.5 rounded-xl border px-1 py-2 ${on ? "border-accent-ink bg-accent" : "border-border"}`}
                  >
                    <Text tone="muted" className="text-[11px]">{item.label}</Text>
                    <Text weight="semibold" tone={changeTone(item.value)} className="text-sm">{formatSignedPercent(item.value)}</Text>
                    {comparable ? <Text tone="muted" className="text-[10.5px]">S&P {formatSignedPercent(item.benchmark)}</Text> : null}
                  </Pressable>
                )
              })}
            </View>
          ) : (
            <Skeleton height={110} />
          )}
        </Card>

        <Card className="gap-3">
          <Text weight="semibold" className="text-[15px]">Últimas 52 semanas</Text>
          {!history.data ? (
            <Skeleton height={120} />
          ) : !stats ? (
            <Text tone="muted" className="text-sm">Todavía no hay un año de cierres para calcularlo.</Text>
          ) : (
            <>
              <View role="img" aria-label={`Hoy ${formatUsd(price)}, entre ${formatUsd(stats.low)} y ${formatUsd(stats.high)}`}>
                <View className="h-2 rounded-full bg-muted" />
                <View
                  className="absolute -top-1.5 h-5 w-1 rounded-sm bg-foreground"
                  style={{ left: `${Math.min(100, Math.max(0, (((price ?? stats.low) - stats.low) / Math.max(stats.high - stats.low, 1e-9)) * 100))}%` }}
                />
                <View className="mt-2 flex-row justify-between">
                  <Text tone="muted" className="text-xs">Mín. {formatUsd(stats.low)}</Text>
                  <Text tone="muted" className="text-xs">Máx. {formatUsd(stats.high)}</Text>
                </View>
              </View>
              <View>
                <Fact label="Volatilidad anual" value={stats.volatility === null ? "—" : `${stats.volatility.toFixed(1)} %`} first />
                <Fact label="Peor caída del año" value={formatSignedPercent(stats.maxDrawdown)} tone="loss" />
                <Fact label="Distancia al máximo" value={Math.abs(stats.fromHigh) < 0.05 ? "en su máximo" : formatSignedPercent(stats.fromHigh)} />
              </View>
              <Text tone="muted" className="text-[11.5px]">Calculado con los cierres diarios del último año.</Text>
            </>
          )}
        </Card>

        <Card className="gap-1">
          <Text weight="semibold" className="text-[15px]">Tu posición</Text>
          {position ? (
            <View className="mt-1">
              <Fact label="Tienes" value={`${formatQuantity(held)} ${unitOf(data.symbol, data.type, held)}`} first />
              <Fact label="Costo promedio" value={formatUsd(position.averageCost)} />
              <Fact label="Precio hoy" value={formatUsd(position.currentPrice)} />
              <Fact label="Vale" value={formatTokens(position.marketValue)} />
              <Fact
                label="Ganancia o pérdida sin realizar"
                value={`${formatSigned(position.unrealizedPnl)}${(() => {
                  const pct = returnPercent(position.unrealizedPnl, held * position.averageCost)
                  return pct === null ? "" : ` (${formatSignedPercent(pct)})`
                })()}`}
                tone={changeTone(position.unrealizedPnl)}
              />
              {portfolio.data && portfolio.data.simulatedValue > 0 && position.marketValue !== null ? (
                <Fact label="Peso en tu portafolio" value={`${Math.round((position.marketValue / portfolio.data.simulatedValue) * 100)} %`} />
              ) : null}
            </View>
          ) : (
            <Text tone="muted" className="mt-1 text-[13px] leading-5">Todavía no tienes {data.symbol}. Puedes comprar desde 0.01 fichas.</Text>
          )}
        </Card>

        <Card className="gap-1 pb-1.5">
          <Text weight="semibold" className="pb-1.5 text-[15px]">Tus órdenes de {data.symbol}</Text>
          {orders.error && !orders.data ? (
            <ErrorState error={orders.error} onRetry={orders.reload} />
          ) : !orders.data ? (
            <Skeleton height={20} />
          ) : orders.data.length === 0 ? (
            <Text tone="muted" className="pb-2.5 text-[13px]">Todavía no hiciste órdenes de {data.symbol}.</Text>
          ) : (
            orders.data.slice(0, 5).map((order) => (
              <Pressable key={order.id} role="button" onPress={() => setReceipt(order)} className="min-h-12 flex-row items-center gap-2.5 border-t border-border active:opacity-70">
                <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: order.side === "BUY" ? colors.accent : colors.muted }}>
                  <Text weight="semibold" tone={order.side === "BUY" ? "accent" : "default"} className="text-[11px]">{ORDER_SIDE_LABEL[order.side]}</Text>
                </View>
                <Text className="flex-1 text-[13px]">{formatQuantity(order.quantity)} · {formatDateTime(order.createdAt)}</Text>
                <Text weight="semibold" tone={order.status === "EXECUTED" ? "gain" : "warning"} className="text-xs">{ORDER_STATUS_LABEL[order.status]}</Text>
              </Pressable>
            ))
          )}
        </Card>

        {data.source !== "MANUAL" ? (
          <Card className="gap-1 pb-1.5">
            <Text weight="semibold" className="text-[15px]">Noticias de {data.symbol}</Text>
            <Text tone="muted" className="pb-1.5 text-xs">En inglés, tal como las publica Benzinga.</Text>
            {!news.data ? (
              news.error ? <ErrorState error={news.error} onRetry={news.reload} /> : <Skeleton height={40} />
            ) : news.data.items.length === 0 ? (
              <Text tone="muted" className="pb-2.5 text-[13px]">Ninguna nota reciente lo menciona.</Text>
            ) : (
              news.data.items.slice(0, 3).map((item) => (
                <Pressable key={item.id} role="button" onPress={() => setReading(item)} className="gap-1 border-t border-border py-2.5 active:opacity-70">
                  <Text weight="semibold" className="text-sm leading-5">{item.headline}</Text>
                  <Text tone="muted" className="text-xs">{sourceLabel(item.source)} · {formatNewsStamp(item)}</Text>
                </Pressable>
              ))
            )}
          </Card>
        ) : null}

        <Text tone="muted" className="text-xs leading-5">
          Antes de operar por una noticia, mira el gráfico: si ya subió o bajó fuerte, probablemente ya está en el precio.
        </Text>
        {data.active ? <View style={{ height: 72 }} /> : <Notice>{`${data.symbol} ya no se opera: puedes ver su historia, pero no comprarlo ni venderlo.`}</Notice>}
      </Screen>

      {data.active ? (
        <View className="absolute inset-x-0 bottom-0 flex-row gap-2.5 border-t border-border bg-background px-5 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
          <View className="flex-1"><Button label="Comprar" onPress={() => trade("BUY")} /></View>
          <View className="flex-1"><Button label="Vender" variant="outline" disabled={held === 0} onPress={() => trade("SELL")} /></View>
        </View>
      ) : null}

      <OrderSheet target={target} onClose={() => setTarget(null)} onDone={onDone} />
      <ReceiptSheet
        order={receipt}
        name={data.name}
        onClose={() => setReceipt(null)}
        onRepeat={(order) => {
          setReceipt(null)
          setTimeout(() => trade(order.side), 350)
        }}
      />
      <NewsReaderSheet
        news={reading}
        heldIds={portfolio.data?.positions.map((p) => p.assetId) ?? []}
        saved={reading ? saved.isSaved(reading.id) : false}
        onToggleSave={saved.toggle}
        onClose={() => setReading(null)}
        onTrade={(newsAsset) => {
          setReading(null)
          const owned = portfolio.data?.positions.find((p) => p.assetId === newsAsset.assetId)?.quantity ?? 0
          setTimeout(() => setTarget({ assetId: newsAsset.assetId, symbol: newsAsset.symbol, name: newsAsset.name, side: "BUY", held: owned }), 350)
        }}
      />
    </View>
  )
}

function Badge({ label }: { label: string }) {
  return (
    <View className="rounded-md border border-border px-2 py-0.5">
      <Text weight="medium" className="text-[11px]">{label}</Text>
    </View>
  )
}

function Fact({ label, value, tone = "default", first = false }: { label: string; value: string; tone?: ReturnType<typeof changeTone> | "default" | "loss"; first?: boolean }) {
  return (
    <View className={`min-h-11 flex-row items-center justify-between gap-3 py-2 ${first ? "" : "border-t border-border"}`}>
      <Text tone="muted" className="flex-1 text-sm">{label}</Text>
      <Text weight="semibold" tone={tone} className="text-sm">{value}</Text>
    </View>
  )
}
