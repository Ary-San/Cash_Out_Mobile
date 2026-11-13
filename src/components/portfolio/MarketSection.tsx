import { useState } from "react"
import { Pressable, TextInput, View } from "react-native"
import { router } from "expo-router"
import { Search, Star, X } from "lucide-react-native"
import Svg, { Path } from "react-native-svg"
import { userMessage, toApiError } from "@/api/errors"
import { AssetRow } from "@/components/portfolio/AssetRow"
import { Card } from "@/components/ui/Card"
import { ErrorState, Skeleton } from "@/components/ui/States"
import { Text } from "@/components/ui/Text"
import { useToast } from "@/components/ui/Toast"
import { useApiQuery } from "@/hooks/useApiQuery"
import { useAsyncAction } from "@/hooks/useAsyncAction"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { useWatchlist } from "@/hooks/useWatchlist"
import { addDays, todayIso } from "@/lib/dates"
import { changeTone, formatSignedPercent, formatUsd } from "@/lib/market"
import { marketService } from "@/services/marketService"
import type { Asset, AssetQuote, AssetType, Position, PricePoint } from "@/types/market"
import { usePalette } from "@/theme/palette"
import { TOUCH_SLOP } from "@/lib/touch"

const PAGE = 20
const FACETS: { value: "" | AssetType; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "STOCK", label: "Acciones" },
  { value: "ETF", label: "ETF" },
  { value: "CRYPTO", label: "Cripto" },
]
const FEATURED = ["SPY", "QQQ", "BTC-USD", "ETH-USD"]
const SUGGESTIONS = ["Apple", "Tesla", "S&P 500", "Bitcoin"]

interface MarketSectionProps {
  positions: Position[] | undefined
}

export function MarketSection({ positions }: MarketSectionProps) {
  const colors = usePalette()
  const toast = useToast()
  const watchlist = useWatchlist()
  const [text, setText] = useState("")
  const [type, setType] = useState<"" | AssetType>("")
  const [mine, setMine] = useState(false)
  const search = useDebouncedValue(text.trim(), 300)
  const heldIds = positions?.map((position) => position.assetId) ?? []

  const filterKey = JSON.stringify([search, type])
  const first = useApiQuery(["assets", search, type], (signal) =>
    marketService.searchAssets({ page: 0, size: PAGE, search: search || undefined, type: type || undefined }, signal),
  )
  const [more, setMore] = useState<{ key: string; items: Asset[]; page: number }>()
  const extra = more?.key === filterKey ? more : undefined
  const loaded = first.data ? [...first.data.content, ...(extra?.items ?? [])] : undefined
  const nextPage = (extra?.page ?? 0) + 1
  const hasMore = Boolean(first.data && nextPage < first.data.totalPages)
  const loadMore = useAsyncAction(async () => {
    try {
      const page = await marketService.searchAssets({ page: nextPage, size: PAGE, search: search || undefined, type: type || undefined })
      setMore((prev) => ({ key: filterKey, page: nextPage, items: [...(prev?.key === filterKey ? prev.items : []), ...page.content] }))
    } catch (err) {
      toast(userMessage(toApiError(err)))
    }
  })

  // Lo propio son pocos activos: se traen uno por uno y se filtran aqui.
  const held = useApiQuery(["held-assets", mine ? heldIds : null], (signal) =>
    mine ? Promise.all(heldIds.map((id) => marketService.getAsset(id, signal))) : Promise.resolve(null),
  )
  const term = search.toLowerCase()
  const rows = mine
    ? held.data?.filter((asset) => (!type || asset.type === type) && (!term || asset.symbol.toLowerCase().includes(term) || asset.name.toLowerCase().includes(term)))
    : loaded

  const counts = useApiQuery(["asset-counts"], async (signal) => {
    const pages = await Promise.all(FACETS.map((facet) => marketService.searchAssets({ page: 0, size: 1, type: facet.value || undefined }, signal)))
    return Object.fromEntries(FACETS.map((facet, i) => [facet.value, pages[i].totalElements]))
  })

  const featured = useApiQuery(["featured-assets"], async (signal) => {
    const found = await Promise.all(
      FEATURED.map((symbol) =>
        marketService.searchAssets({ search: symbol, page: 0, size: 1 }, signal).then((page) => page.content.find((asset) => asset.symbol === symbol)),
      ),
    )
    const assets = found.filter((asset): asset is Asset => asset !== undefined)
    const range = { from: addDays(todayIso(), -31), to: todayIso() }
    const [quotes, histories] = await Promise.all([
      marketService.quotes(assets.map((asset) => asset.id), signal).catch(() => [] as AssetQuote[]),
      Promise.all(assets.map((asset) => marketService.getPriceHistory(asset.id, signal, range).catch(() => [] as PricePoint[]))),
    ])
    return assets.map((asset, i) => ({ asset, quote: quotes.find((quote) => quote.symbol === asset.symbol), points: histories[i] }))
  })

  const toggleFavorite = (asset: Asset) => void watchlist.toggle(asset)
  const ids = [...(rows ?? []), ...(watchlist.assets ?? [])].map((asset) => asset.id)
  const quotes = useApiQuery(["asset-quotes", ids], (signal) => marketService.quotes(ids, signal))
  const quoteOf = (asset: Asset) => quotes.data?.find((quote) => quote.symbol === asset.symbol)
  const hasFilters = Boolean(text || type || mine)
  const clear = () => {
    setText("")
    setType("")
    setMine(false)
  }

  return (
    <View className="gap-4">
      {featured.data && featured.data.length > 0 ? (
        <View aria-label="Destacados" className="flex-row flex-wrap justify-between gap-y-2.5">
          {featured.data.map(({ asset, quote, points }) => (
            <Pressable
              key={asset.id}
              role="link"
              aria-label={`${asset.name}, ${formatUsd(quote?.price)}, ${formatSignedPercent(quote?.changePercent)}`}
              onPress={() => router.push({ pathname: "/asset/[id]", params: { id: String(asset.id) } })}
              className="w-[48.5%] gap-1 rounded-2xl border border-border bg-card px-3.5 py-3 active:opacity-80"
            >
              <View className="flex-row justify-between">
                <Text weight="medium" className="text-[13px]">{asset.symbol.replace(/-USD$/, "")}</Text>
                <Text weight="semibold" tone={changeTone(quote?.changePercent)} className="text-xs">{formatSignedPercent(quote?.changePercent)}</Text>
              </View>
              <Text weight="semibold" className="text-[17px]">{formatUsd(quote?.price)}</Text>
              <Sparkline points={points} colorUp={colors.gain} colorDown={colors.loss} />
              <Text tone="muted" className="text-[11px]">último mes</Text>
            </Pressable>
          ))}
        </View>
      ) : featured.isLoading ? (
        <Skeleton height={120} />
      ) : null}

      <Card className="overflow-hidden p-0">
        <View className="flex-row items-center gap-2 px-4 pb-3 pt-3.5">
          <Star size={16} color={colors.accentInk} fill={colors.accentInk} />
          <Text weight="semibold" className="text-[15px]">Favoritos</Text>
        </View>
        {watchlist.error && !watchlist.assets ? (
          <View className="px-4 pb-4"><ErrorState error={watchlist.error} onRetry={watchlist.reload} /></View>
        ) : !watchlist.assets ? (
          <View className="px-4 pb-4"><Skeleton height={20} /></View>
        ) : watchlist.assets.length === 0 ? (
          <Text tone="muted" className="border-t border-border px-4 py-3.5 text-[13px]">
            Toca la ★ de un activo para seguirlo aquí, con su precio del día.
          </Text>
        ) : (
          <View className="border-t border-border">
            {watchlist.assets.map((asset, i) => (
              <AssetRow key={asset.id} first={i === 0} asset={asset} quote={quoteOf(asset)} held={heldIds.includes(asset.id)} favorite onToggleFavorite={toggleFavorite} />
            ))}
          </View>
        )}
      </Card>

      <Card className="overflow-hidden p-0">
        <View className="gap-2.5 p-4 pb-3">
          <View className="min-h-12 flex-row items-center gap-2 rounded-xl border border-input bg-card px-3.5">
            <Search size={18} color={colors.mutedForeground} />
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Nombre o símbolo: Apple, TSLA, S&P 500…"
              placeholderTextColor={colors.mutedForeground}
              accessibilityLabel="Buscar acciones"
              autoCorrect={false}
              className="flex-1 font-sans text-[15px] text-foreground"
            />
          </View>
          <View role="group" aria-label="Tipo de activo" className="flex-row flex-wrap gap-1.5">
            <Chip on={mine} onPress={() => setMine(!mine)} label={`Solo los míos${positions ? ` · ${positions.length}` : ""}`} />
            {FACETS.map((facet) => (
              <Chip
                key={facet.label}
                on={type === facet.value}
                onPress={() => setType(facet.value)}
                label={facet.label}
                count={counts.data?.[facet.value]}
              />
            ))}
          </View>
          {hasFilters ? (
            <Pressable hitSlop={TOUCH_SLOP} role="button" onPress={clear} className="min-h-9 flex-row items-center gap-1.5 self-start active:opacity-70">
              <X size={16} color={colors.foreground} />
              <Text weight="medium" className="text-sm">Limpiar filtros</Text>
            </Pressable>
          ) : null}
        </View>

        {(mine ? held.error : first.error) && !rows ? (
          <View className="px-4 pb-4"><ErrorState error={(mine ? held.error : first.error)!} onRetry={mine ? held.reload : first.reload} /></View>
        ) : !rows ? (
          <View className="gap-3 border-t border-border p-4"><Skeleton height={20} /><Skeleton height={20} /></View>
        ) : rows.length === 0 ? (
          <View className="items-center gap-1.5 border-t border-border px-4 py-7">
            <Text weight="semibold">
              {search ? `No encontramos «${search}»` : mine ? "No tienes activos con estos filtros" : "No hay activos con estos filtros"}
            </Text>
            <Text tone="muted" className="text-[13px]">Prueba con el nombre de la empresa o con alguno de estos:</Text>
            <View className="mt-1.5 flex-row flex-wrap justify-center gap-1.5">
              {SUGGESTIONS.map((suggestion) => (
                <Chip key={suggestion} on={false} label={suggestion} onPress={() => { setText(suggestion); setType(""); setMine(false) }} />
              ))}
            </View>
          </View>
        ) : (
          <View className={`border-t border-border ${first.isRefreshing ? "opacity-60" : ""}`}>
            {rows.map((asset, i) => (
              <AssetRow
                key={asset.id}
                first={i === 0}
                asset={asset}
                quote={quoteOf(asset)}
                held={heldIds.includes(asset.id)}
                favorite={watchlist.isFavorite(asset.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
            {!mine && hasMore ? (
              <View className="border-t border-border p-3">
                <Pressable hitSlop={TOUCH_SLOP} role="button" disabled={loadMore.isPending} onPress={() => void loadMore.run()} className="min-h-10 items-center justify-center rounded-full border border-border active:opacity-70">
                  <Text weight="medium" className="text-sm">{loadMore.isPending ? "Cargando…" : "Cargar más"}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
      </Card>
      <Text tone="muted" className="text-center text-xs leading-4">Las acciones y ETF cambian en horario de Nueva York; la cripto, todo el día.</Text>
    </View>
  )
}

function Chip({ on, label, count, onPress }: { on: boolean; label: string; count?: number; onPress: () => void }) {
  return (
    <Pressable
      hitSlop={TOUCH_SLOP}
      role="button"
      aria-pressed={on}
      onPress={onPress}
      className={`min-h-9 flex-row items-center gap-1.5 rounded-full border px-3 ${on ? "border-accent-ink bg-accent" : "border-border bg-card"}`}
    >
      <Text weight={on ? "semibold" : "regular"} className="text-[13px]">{label}</Text>
      {count !== undefined ? <Text tone="muted" className="text-[13px]">{count.toLocaleString("es-PE")}</Text> : null}
    </Pressable>
  )
}

function Sparkline({ points, colorUp, colorDown }: { points: PricePoint[]; colorUp: string; colorDown: string }) {
  const [width, setWidth] = useState(0)
  const values = points.map((point) => point.closePrice)
  if (values.length < 2) return <View className="h-[30px]" />
  const min = Math.min(...values)
  const span = Math.max(Math.max(...values) - min, Math.abs(min) * 0.01, 1e-9)
  const d = values.map((v, i) => `${i ? "L" : "M"}${((i / (values.length - 1)) * width).toFixed(1)} ${(27 - ((v - min) / span) * 24).toFixed(1)}`).join(" ")
  return (
    <View className="h-[30px]" onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={30}>
          <Path d={d} fill="none" stroke={values[values.length - 1] >= values[0] ? colorUp : colorDown} strokeWidth={1.6} />
        </Svg>
      ) : null}
    </View>
  )
}
