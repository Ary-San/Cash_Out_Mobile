import { useState } from "react"
import { Pressable, View } from "react-native"
import { router } from "expo-router"
import { ChevronDown, Search } from "lucide-react-native"
import { LineChart } from "@/components/portfolio/LineChart"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Skeleton } from "@/components/ui/States"
import { Text } from "@/components/ui/Text"
import { useApiQuery } from "@/hooks/useApiQuery"
import { changeTone, formatQuantity, formatSigned, formatSignedPercent, formatTokenAmount, formatUsd, returnPercent } from "@/lib/market"
import { marketService } from "@/services/marketService"
import type { OrderSide, Position, PricePoint } from "@/types/market"
import { usePalette } from "@/theme/palette"
import { TOUCH_SLOP } from "@/lib/touch"

interface PositionsCardProps {
  positions: Position[] | undefined
  /** Cierres del ultimo mes por activo, para la linea de cada fila. */
  closes: Map<number, PricePoint[]> | undefined
  colorOf: (assetId: number) => string
  onTrade: (position: Position, side: OrderSide) => void
  onExplore: () => void
}

/** Lo que tienes, una fila por activo; al abrirla, su ultimo mes contra tu costo promedio. */
export function PositionsCard({ positions, closes, colorOf, onTrade, onExplore }: PositionsCardProps) {
  const colors = usePalette()
  const [open, setOpen] = useState<number | null | undefined>(undefined)
  const expanded = open === undefined ? positions?.[0]?.assetId : open

  return (
    <Card className="overflow-hidden p-0">
      <View className="flex-row items-center justify-between py-1.5 pl-4 pr-1.5">
        <Text weight="semibold" className="text-[15px]">Mis inversiones</Text>
        <Pressable hitSlop={TOUCH_SLOP} role="button" onPress={onExplore} className="min-h-10 flex-row items-center gap-1.5 rounded-full px-2.5 active:opacity-70">
          <Search size={16} color={colors.foreground} />
          <Text weight="medium" className="text-sm">Explorar mercado</Text>
        </Pressable>
      </View>

      {!positions ? (
        <View className="gap-3 border-t border-border p-4">
          <Skeleton height={20} />
          <Skeleton height={20} />
        </View>
      ) : positions.length === 0 ? (
        <View className="mx-4 mb-4 gap-1.5 rounded-2xl border border-dashed border-border px-4 py-6">
          <Text weight="semibold" className="text-center">Todavía no tienes inversiones</Text>
          <Text tone="muted" className="text-center text-[13px] leading-5">
            Busca una empresa que conozcas en «Nueva orden» y compra con tus fichas. Puedes comprar fracciones.
          </Text>
        </View>
      ) : (
        <View role="list" aria-label="Tus inversiones">
          {positions.map((position) => {
            const isOpen = expanded === position.assetId
            const pct = returnPercent(position.unrealizedPnl, position.quantity * position.averageCost)
            return (
              <View key={position.id} role="listitem" className={`border-t border-border ${isOpen ? "bg-muted/40" : ""}`}>
                <Pressable
                  role="button"
                  aria-expanded={isOpen}
                  onPress={() => setOpen(isOpen ? null : position.assetId)}
                  className="min-h-16 flex-row items-center gap-3 py-2.5 pl-4 pr-3"
                >
                  <View className="size-9 items-center justify-center rounded-[10px]" style={{ backgroundColor: colorOf(position.assetId) }}>
                    <Text weight="semibold" className="text-xs" style={{ color: colors.card }}>{position.symbol[0]}</Text>
                  </View>
                  <View className="flex-1">
                    <Text weight="semibold" className="text-[15px]">{position.symbol}</Text>
                    <Text tone="muted" numberOfLines={1} className="text-xs">{formatQuantity(position.quantity)} · {position.assetName}</Text>
                  </View>
                  <View className="items-end">
                    <Text weight="semibold" className="text-[15px]">{position.marketValue === null ? "—" : formatTokenAmount(position.marketValue)}</Text>
                    <Text weight="medium" tone={changeTone(position.unrealizedPnl)} className="text-xs">
                      {formatSigned(position.unrealizedPnl)}{pct !== null ? ` (${formatSignedPercent(pct)})` : ""}
                    </Text>
                  </View>
                  <View style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }}>
                    <ChevronDown size={16} color={colors.mutedForeground} />
                  </View>
                </Pressable>
                {isOpen ? <PositionDetail position={position} closes={closes?.get(position.assetId)} lineColor={colorOf(position.assetId)} onTrade={onTrade} /> : null}
              </View>
            )
          })}
        </View>
      )}
    </Card>
  )
}

function PositionDetail({ position, closes, lineColor, onTrade }: { position: Position; closes: PricePoint[] | undefined; lineColor: string; onTrade: (p: Position, s: OrderSide) => void }) {
  const quote = useApiQuery(["quote", position.assetId], (signal) => marketService.getQuote(position.assetId, signal))
  const prices = closes?.map((point) => point.closePrice) ?? []
  const facts: [string, string, ReturnType<typeof changeTone> | "default"][] = [
    ["Precio hoy", formatUsd(position.currentPrice), "default"],
    ["Hoy", formatSignedPercent(quote.data?.changePercent), changeTone(quote.data?.changePercent)],
    ["Máx. del mes", prices.length ? formatUsd(Math.max(...prices)) : "—", "default"],
    ["Mín. del mes", prices.length ? formatUsd(Math.min(...prices)) : "—", "default"],
  ]

  return (
    <View className="gap-3 px-4 pb-4">
      {prices.length > 1 ? (
        <LineChart
          height={90}
          lines={[{ values: prices, color: lineColor }]}
          guide={{ value: position.averageCost, label: `Tu costo ${formatUsd(position.averageCost)}` }}
          accessibilityLabel={`${position.symbol} en el último mes contra tu costo promedio de ${formatUsd(position.averageCost)}`}
        />
      ) : closes ? (
        <Text tone="muted" className="text-xs">Todavía no hay cierres del último mes para dibujar.</Text>
      ) : (
        <Skeleton height={90} />
      )}
      <View className="flex-row flex-wrap gap-y-2.5">
        {facts.map(([label, value, tone]) => (
          <View key={label} className="w-1/2 gap-0.5 pr-3">
            <Text tone="muted" className="text-xs">{label}</Text>
            <Text weight="semibold" tone={tone} className="text-sm">{value}</Text>
          </View>
        ))}
      </View>
      <View className="flex-row gap-2">
        <View className="flex-1"><Button label="Comprar" onPress={() => onTrade(position, "BUY")} /></View>
        <View className="flex-1"><Button label="Vender" variant="outline" onPress={() => onTrade(position, "SELL")} /></View>
        <View className="flex-1">
          <Button label="Ver activo" variant="outline" onPress={() => router.push({ pathname: "/asset/[id]", params: { id: String(position.assetId) } })} />
        </View>
      </View>
    </View>
  )
}
