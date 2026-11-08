import { Pressable, View } from "react-native"
import { router } from "expo-router"
import { ChevronRight, Gamepad2 } from "lucide-react-native"
import { AllocationCard } from "@/components/portfolio/AllocationCard"
import { MetricsCard } from "@/components/portfolio/MetricsCard"
import { NewOrderCard } from "@/components/portfolio/NewOrderCard"
import type { OrderTarget } from "@/components/portfolio/OrderSheet"
import { PositionsCard } from "@/components/portfolio/PositionsCard"
import { Card } from "@/components/ui/Card"
import { ErrorState } from "@/components/ui/States"
import { Text } from "@/components/ui/Text"
import { useApiQuery, type ApiQuery } from "@/hooks/useApiQuery"
import { addDays } from "@/lib/dates"
import { lastDays, portfolioHistory, type PortfolioNow } from "@/lib/portfolioHistory"
import { marketService } from "@/services/marketService"
import { portfolioService } from "@/services/portfolioService"
import type { Portfolio, PricePoint } from "@/types/market"
import { usePalette, useSeriesColors } from "@/theme/palette"

const DAYS = 30

interface MineSectionProps {
  portfolio: ApiQuery<Portfolio>
  tokens: number | undefined
  /** Sube con cada orden: la historia se vuelve a armar. */
  version: number
  onTrade: (target: OrderTarget) => void
  onExplore: () => void
}

export function MineSection({ portfolio, tokens, version, onTrade, onExplore }: MineSectionProps) {
  const colors = usePalette()
  const series = useSeriesColors()
  const days = lastDays(DAYS)
  const history = useApiQuery(["portfolio-history", days[0], version], async (signal) => {
    const orders = await portfolioService.allOrders(signal)
    const ids = [...new Set(orders.filter((order) => order.status === "EXECUTED").map((order) => order.assetId))]
    // Unos dias antes, para tener un cierre con que valorar el primer dia aunque caiga en feriado.
    const range = { from: addDays(days[0], -7), to: days[DAYS - 1] }
    const closes = new Map<number, PricePoint[]>(
      await Promise.all(ids.map(async (id) => [id, await marketService.getPriceHistory(id, signal, range).catch(() => [])] as const)),
    )
    return { orders, closes }
  })

  const data = portfolio.data
  const positions = data?.positions
  const now: PortfolioNow | undefined = data ? { value: data.simulatedValue, unrealized: data.unrealizedPnl, realized: data.realizedPnl } : undefined
  const chart = history.data && now ? portfolioHistory(days, history.data.orders, history.data.closes, now) : undefined
  const monthCloses = history.data
    ? new Map([...history.data.closes].map(([id, points]) => [id, points.filter((point) => point.date >= days[0])]))
    : undefined

  // El color sigue al activo (por id), no a su tamaño en el portafolio.
  const byId = [...(positions ?? [])].sort((a, b) => a.assetId - b.assetId)
  const colorOf = (assetId: number) => {
    const index = byId.findIndex((position) => position.assetId === assetId)
    return index >= 0 && index < series.length ? series[index] : colors.mutedForeground
  }

  if (portfolio.error && !data) return <ErrorState error={portfolio.error} onRetry={portfolio.reload} />

  return (
    <View className="gap-4">
      <MetricsCard now={now} history={chart} />
      <PositionsCard
        positions={positions}
        closes={monthCloses}
        colorOf={colorOf}
        onExplore={onExplore}
        onTrade={(position, side) =>
          onTrade({ assetId: position.assetId, symbol: position.symbol, name: position.assetName, side, held: position.quantity })
        }
      />
      <NewOrderCard
        positions={positions}
        onPick={(asset) => onTrade({ ...asset, side: "BUY", held: positions?.find((p) => p.assetId === asset.assetId)?.quantity ?? 0 })}
      />
      <AllocationCard tokens={tokens} positions={positions} colorOf={colorOf} />
      <Pressable role="link" onPress={() => router.push("/games")} className="active:opacity-80">
        <Card className="flex-row items-center gap-3.5">
          <View className="size-10 items-center justify-center rounded-xl bg-accent">
            <Gamepad2 size={20} color={colors.accentInk} />
          </View>
          <View className="flex-1">
            <Text weight="semibold" className="text-[15px]">Aprende jugando</Text>
            <Text tone="muted" className="text-[13px] leading-5">Carrera, ¿Sube o baja? y Arma tu portafolio, con la clase o solo</Text>
          </View>
          <ChevronRight size={18} color={colors.mutedForeground} />
        </Card>
      </Pressable>
    </View>
  )
}
