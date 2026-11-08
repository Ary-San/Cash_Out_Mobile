import { useCallback, useRef, useState } from "react"
import { Pressable, ScrollView, View } from "react-native"
import { useFocusEffect, useLocalSearchParams } from "expo-router"
import { ChartCandlestick, ListOrdered, Newspaper, Wallet, type LucideIcon } from "lucide-react-native"
import { MarketSection } from "@/components/portfolio/MarketSection"
import { MineSection } from "@/components/portfolio/MineSection"
import { NewsSection } from "@/components/portfolio/NewsSection"
import { OrderSheet, type OrderTarget } from "@/components/portfolio/OrderSheet"
import { OrdersSection } from "@/components/portfolio/OrdersSection"
import { Screen } from "@/components/ui/Screen"
import { Text } from "@/components/ui/Text"
import { useApiQuery } from "@/hooks/useApiQuery"
import { formatTokenAmount } from "@/lib/market"
import { financeService } from "@/services/financeService"
import { portfolioService } from "@/services/portfolioService"
import { usePalette } from "@/theme/palette"

type Section = "mine" | "market" | "orders" | "news"

const SECTIONS: { value: Section; label: string; icon: LucideIcon }[] = [
  { value: "mine", label: "Mis inversiones", icon: Wallet },
  { value: "market", label: "Mercado", icon: ChartCandlestick },
  { value: "orders", label: "Órdenes", icon: ListOrdered },
  { value: "news", label: "Noticias", icon: Newspaper },
]

const isSection = (value: unknown): value is Section => SECTIONS.some((s) => s.value === value)

export default function PortfolioScreen() {
  const colors = usePalette()
  const params = useLocalSearchParams<{ seccion?: string }>()
  const [section, setSection] = useState<Section>(isSection(params.seccion) ? params.seccion : "mine")
  // Sube con cada orden ejecutada: portafolio, fichas e historia se vuelven a pedir.
  const [version, setVersion] = useState(0)
  const [target, setTarget] = useState<OrderTarget | null>(null)

  const portfolio = useApiQuery(["portfolio", version], (signal) => portfolioService.get(signal))
  const wallet = useApiQuery(["token-wallet", version], (signal) => financeService.wallet(signal))

  // Al volver del detalle de un activo (una compra ahi) el portafolio tiene que reflejarlo.
  const firstFocus = useRef(true)
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) firstFocus.current = false
      else setVersion((n) => n + 1)
    }, []),
  )

  const tokens = wallet.data?.tokenBalance

  return (
    <View className="flex-1">
      <Screen
        title="Tu portafolio"
        subtitle="Inviertes fichas en acciones de EE. UU. y criptomonedas con precios reales: nada de esto es dinero real."
        action={
          <View aria-label={tokens === undefined ? undefined : `Tienes ${formatTokenAmount(tokens)} fichas libres para invertir`} className="h-9 flex-row items-center gap-1.5 rounded-full border border-border bg-card px-3">
            <Text weight="semibold" className="text-[13px]">{tokens === undefined ? "—" : formatTokenAmount(tokens)}</Text>
            <Text tone="muted" className="text-[13px]">libres</Text>
          </View>
        }
        onRefresh={() => setVersion((n) => n + 1)}
        refreshing={portfolio.isRefreshing}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 border-b border-border" contentContainerClassName="gap-1 px-5">
          {SECTIONS.map(({ value, label, icon: Icon }) => {
            const on = section === value
            return (
              <Pressable
                key={value}
                role="tab"
                aria-selected={on}
                onPress={() => setSection(value)}
                className="-mb-px h-11 flex-row items-center gap-1.5 border-b-2 px-2.5"
                style={{ borderBottomColor: on ? colors.accentInk : "transparent" }}
              >
                <Icon size={16} color={on ? colors.foreground : colors.mutedForeground} />
                <Text weight={on ? "semibold" : "medium"} tone={on ? "default" : "muted"} className="text-sm">{label}</Text>
              </Pressable>
            )
          })}
        </ScrollView>

        {section === "mine" ? (
          <MineSection portfolio={portfolio} tokens={tokens} version={version} onTrade={setTarget} onExplore={() => setSection("market")} />
        ) : section === "market" ? (
          <MarketSection positions={portfolio.data?.positions} />
        ) : section === "orders" ? (
          <OrdersSection version={version} positions={portfolio.data?.positions} onTrade={setTarget} />
        ) : (
          <NewsSection positions={portfolio.data?.positions} onTrade={setTarget} />
        )}
      </Screen>

      <OrderSheet
        target={target}
        onClose={() => setTarget(null)}
        onDone={() => {
          setTarget(null)
          setVersion((n) => n + 1)
        }}
      />
    </View>
  )
}
