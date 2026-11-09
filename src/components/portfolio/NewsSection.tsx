import { useState } from "react"
import { Pressable, View } from "react-native"
import { Check, Star, X } from "lucide-react-native"
import { NewsReaderSheet } from "@/components/portfolio/NewsReaderSheet"
import type { OrderTarget } from "@/components/portfolio/OrderSheet"
import { Card } from "@/components/ui/Card"
import { ErrorState, Skeleton } from "@/components/ui/States"
import { Text, Title } from "@/components/ui/Text"
import { useApiQuery } from "@/hooks/useApiQuery"
import { useNewsFeed } from "@/hooks/useNewsFeed"
import { useSavedNews } from "@/hooks/useSavedNews"
import { NEWS_SCOPES, formatNewsStamp, groupNewsByDay, sourceLabel } from "@/lib/news"
import { newsService } from "@/services/newsService"
import type { Position } from "@/types/market"
import type { NewsItem, NewsScope } from "@/types/news"
import { usePalette } from "@/theme/palette"
import { TOUCH_SLOP } from "@/lib/touch"

const SCOPE_TEXT: Record<NewsScope, string> = { mine: "de tus inversiones", market: "del mercado", crypto: "de cripto" }

interface NewsSectionProps {
  positions: Position[] | undefined
  onTrade: (target: OrderTarget) => void
}

export function NewsSection({ positions, onTrade }: NewsSectionProps) {
  const colors = usePalette()
  const saved = useSavedNews()
  const [chosen, setChosen] = useState<NewsScope>()
  const [symbol, setSymbol] = useState<string>()
  const [onlySaved, setOnlySaved] = useState(false)
  const [reading, setReading] = useState<NewsItem | null>(null)

  // Sin eleccion se espera al portafolio: con inversiones se abre en las suyas.
  const scope = chosen ?? (positions ? (positions.length > 0 ? "mine" : "market") : undefined)
  const feed = useNewsFeed(scope, symbol)
  const trending = useApiQuery(["news-trending"], (signal) => newsService.trending(signal))
  const items = onlySaved ? saved.saved.filter((news) => !symbol || news.assets.some((asset) => asset.symbol === symbol)) : feed.items
  const heldIds = positions?.map((position) => position.assetId) ?? []

  const pickScope = (next: NewsScope) => {
    setChosen(next)
    setSymbol(undefined)
    setOnlySaved(false)
  }
  const toggleSymbol = (next: string) => setSymbol((current) => (current === next ? undefined : next))

  const about = symbol ? `de ${symbol}` : scope ? SCOPE_TEXT[scope] : ""
  const count = items ? `${items.length} ${onlySaved ? (items.length === 1 ? "guardada" : "guardadas") : `${items.length === 1 ? "noticia" : "noticias"} ${about}`}` : ""
  const topMentions = trending.data?.[0]?.mentions ?? 1

  return (
    <View className="gap-3.5">
      <View className="gap-1.5">
        <Title size="md">Lo que mueve el mercado</Title>
        <Text tone="muted" className="text-[13px] leading-5">Noticias de Benzinga vía Alpaca, en inglés tal como se publicaron. Se renuevan cada 5 minutos.</Text>
      </View>

      {positions && positions.length > 0 ? (
        <View role="group" aria-label="Tus activos" className="flex-row flex-wrap gap-1.5">
          {positions.map((position) => (
            <Chip key={position.assetId} on={symbol === position.symbol} label={position.symbol} onPress={() => toggleSymbol(position.symbol)} />
          ))}
        </View>
      ) : null}

      {trending.data && trending.data.length > 0 ? (
        <Card className="gap-2">
          <View>
            <Text weight="semibold" className="text-[15px]">Tendencias</Text>
            <Text tone="muted" className="text-xs">Los activos con más noticias recientes del mercado</Text>
          </View>
          {trending.data.slice(0, 5).map((asset) => (
            <Pressable
              key={asset.assetId}
              role="button"
              aria-label={`${asset.symbol}: ${asset.mentions} noticias. Ver sus noticias`}
              onPress={() => toggleSymbol(asset.symbol)}
              className="min-h-[30px] flex-row items-center gap-2.5"
            >
              <Text weight="medium" className="w-16 text-xs">{asset.symbol.replace(/-USD$/, "")}</Text>
              <View className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                <View className="h-full rounded-full" style={{ width: `${(asset.mentions / topMentions) * 100}%`, backgroundColor: symbol === asset.symbol ? colors.accentInk : colors.border }} />
              </View>
              <Text tone="muted" className="w-5 text-right text-xs">{asset.mentions}</Text>
            </Pressable>
          ))}
        </Card>
      ) : null}

      <View role="radiogroup" aria-label="Qué noticias ver" className="flex-row rounded-full bg-muted p-1">
        {NEWS_SCOPES.map((option) => {
          const on = !symbol && !onlySaved && scope === option.value
          return (
            <Pressable hitSlop={TOUCH_SLOP} key={option.value} role="radio" aria-checked={on} onPress={() => pickScope(option.value)} className={`min-h-9 flex-1 items-center justify-center rounded-full ${on ? "bg-card" : ""}`}>
              <Text weight={on ? "semibold" : "regular"} tone={on ? "default" : "muted"} className="text-[13px]">{option.label}</Text>
            </Pressable>
          )
        })}
      </View>

      <View className="flex-row flex-wrap items-center gap-2">
        <Pressable
          hitSlop={TOUCH_SLOP}
          role="button"
          aria-pressed={onlySaved}
          onPress={() => setOnlySaved(!onlySaved)}
          className={`min-h-9 flex-row items-center gap-1.5 rounded-full border px-3 ${onlySaved ? "border-accent-ink bg-accent" : "border-border bg-card"}`}
        >
          <Star size={14} color={colors.foreground} />
          <Text weight={onlySaved ? "semibold" : "regular"} className="text-[13px]">Guardadas · {saved.saved.length}</Text>
        </Pressable>
        {symbol ? (
          <View className="min-h-9 flex-row items-center gap-1 rounded-full border border-accent-ink bg-accent pl-3 pr-1">
            <Text className="text-[13px]">Símbolo: <Text weight="semibold" className="text-[13px]">{symbol}</Text></Text>
            <Pressable role="button" aria-label="Quitar el filtro de símbolo" onPress={() => setSymbol(undefined)} className="size-7 items-center justify-center rounded-full">
              <X size={14} color={colors.foreground} />
            </Pressable>
          </View>
        ) : null}
        <Text tone="muted" className="ml-auto text-xs">{count}</Text>
      </View>

      {!onlySaved && feed.error && !feed.items ? (
        <ErrorState error={feed.error} onRetry={feed.reload} />
      ) : !items ? (
        <Skeleton height={180} />
      ) : items.length === 0 ? (
        <EmptyNews
          onlySaved={onlySaved}
          symbol={symbol}
          scope={scope}
          hasPositions={heldIds.length > 0}
          onReset={() => pickScope("market")}
        />
      ) : (
        <Card className={`overflow-hidden p-0 ${!onlySaved && feed.isRefreshing ? "opacity-60" : ""}`}>
          {groupNewsByDay(items).map((group) => (
            <View key={group.label}>
              <Text tone="muted" className="px-4 pb-1.5 pt-3 text-[11px] uppercase tracking-widest">{group.label}</Text>
              {group.items.map((news) => {
                const isSaved = saved.isSaved(news.id)
                return (
                  <View key={news.id} className="gap-2 border-t border-border px-4 pb-2.5 pt-3">
                    <Pressable role="button" onPress={() => setReading(news)} className="gap-1.5 active:opacity-70">
                      {news.assets.length > 0 ? (
                        <View className="flex-row flex-wrap gap-1.5">
                          {news.assets.slice(0, 4).map((asset) => (
                            <View key={asset.assetId} className="rounded-full bg-muted px-2 py-0.5">
                              <Text weight="medium" className="text-[11px]">{asset.symbol.replace(/-USD$/, "")}</Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                      <Text weight="semibold" className="text-[15px] leading-5">{news.headline}</Text>
                      <Text tone="muted" className="text-xs">{sourceLabel(news.source)} · {formatNewsStamp(news)}</Text>
                    </Pressable>
                    <Pressable hitSlop={TOUCH_SLOP} role="button" aria-pressed={isSaved} onPress={() => saved.toggle(news)} className="min-h-8 flex-row items-center gap-1.5 self-start">
                      <Star size={15} color={colors.mutedForeground} fill={isSaved ? colors.mutedForeground : "transparent"} />
                      <Text weight="medium" tone="muted" className="text-[13px]">{isSaved ? "Guardada" : "Guardar"}</Text>
                    </Pressable>
                  </View>
                )
              })}
            </View>
          ))}
          {!onlySaved && feed.hasMore ? (
            <View className="border-t border-border p-3">
              <Pressable hitSlop={TOUCH_SLOP} role="button" disabled={feed.isLoadingMore} onPress={() => void feed.loadMore()} className="min-h-10 items-center justify-center rounded-full border border-border active:opacity-70">
                <Text weight="medium" className="text-sm">{feed.isLoadingMore ? "Cargando…" : "Cargar más noticias"}</Text>
              </Pressable>
            </View>
          ) : null}
        </Card>
      )}

      <NewsReaderSheet
        news={reading}
        heldIds={heldIds}
        saved={reading ? saved.isSaved(reading.id) : false}
        onToggleSave={saved.toggle}
        onClose={() => setReading(null)}
        onTrade={(asset) => {
          setReading(null)
          // iOS no abre un Modal mientras otro se esta cerrando.
          setTimeout(
            () =>
              onTrade({
                assetId: asset.assetId,
                symbol: asset.symbol,
                name: asset.name,
                side: "BUY",
                held: positions?.find((position) => position.assetId === asset.assetId)?.quantity ?? 0,
              }),
            350,
          )
        }}
      />
    </View>
  )
}

function Chip({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable hitSlop={TOUCH_SLOP} role="button" aria-pressed={on} onPress={onPress} className={`min-h-9 justify-center rounded-full border px-3 ${on ? "border-accent-ink bg-accent" : "border-border bg-card"}`}>
      <Text weight={on ? "semibold" : "regular"} className="text-[13px]">{label}</Text>
    </Pressable>
  )
}

function EmptyNews({ onlySaved, symbol, scope, hasPositions, onReset }: { onlySaved: boolean; symbol?: string; scope?: NewsScope; hasPositions: boolean; onReset: () => void }) {
  const colors = usePalette()
  let title = "No hay noticias por ahora"
  let text = "Vuelve en unos minutos: el mural se renueva cada 5."
  if (onlySaved) {
    title = "No tienes noticias guardadas aquí"
    text = "Usa «Guardar» en una noticia para tenerla a mano. Las guardadas viven en este celular."
  } else if (symbol) {
    title = `Sin noticias recientes de ${symbol}`
    text = "Ninguna nota reciente lo menciona."
  } else if (scope === "mine") {
    title = hasPositions ? "Sin noticias de tus inversiones" : "Todavía no tienes inversiones"
    text = hasPositions
      ? "Ninguna nota reciente menciona lo que tienes: estás al día."
      : "Cuando compres una acción o una cripto, aquí vas a ver las noticias que la mencionan."
  }
  return (
    <Card className="items-center gap-2 px-6 py-8">
      <View className="size-11 items-center justify-center rounded-full" style={{ backgroundColor: `${colors.gain}22` }}>
        <Check size={20} color={colors.gain} />
      </View>
      <Text weight="semibold" className="text-center">{title}</Text>
      <Text tone="muted" className="text-center text-[13px] leading-5">{text}</Text>
      {onlySaved || symbol || scope !== "market" ? (
        <Pressable hitSlop={TOUCH_SLOP} role="button" onPress={onReset} className="mt-1 min-h-10 justify-center rounded-full border border-border px-4 active:opacity-70">
          <Text weight="medium" className="text-sm">Ver todo el mercado</Text>
        </Pressable>
      ) : null}
    </Card>
  )
}
