import { useState } from "react"
import { Pressable, TextInput, View } from "react-native"
import { Search } from "lucide-react-native"
import { Card } from "@/components/ui/Card"
import { Text } from "@/components/ui/Text"
import { useApiQuery } from "@/hooks/useApiQuery"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { ASSET_TYPE_LABEL, displayName } from "@/lib/market"
import { marketService } from "@/services/marketService"
import type { Asset, Position } from "@/types/market"
import { usePalette } from "@/theme/palette"

interface NewOrderCardProps {
  positions: Position[] | undefined
  onPick: (asset: { assetId: number; symbol: string; name: string }) => void
}

/** Buscar un activo para comprarlo sin ir al mercado, o elegir uno de los tuyos. */
export function NewOrderCard({ positions, onPick }: NewOrderCardProps) {
  const colors = usePalette()
  const [text, setText] = useState("")
  const term = useDebouncedValue(text.trim(), 250)
  const results = useApiQuery(["asset-search", term], (signal) =>
    term ? marketService.searchAssets({ search: term, page: 0, size: 6 }, signal) : Promise.resolve(null),
  )
  const options = term ? (results.data?.content ?? []) : []

  const pick = (asset: Asset) => {
    setText("")
    onPick({ assetId: asset.id, symbol: asset.symbol, name: asset.name })
  }

  return (
    <Card className="gap-3">
      <Text weight="semibold" className="text-[15px]">Nueva orden</Text>
      <View className="h-12 flex-row items-center gap-2 rounded-xl border border-input bg-card px-3.5">
        <Search size={18} color={colors.mutedForeground} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Buscar activo…"
          placeholderTextColor={colors.mutedForeground}
          accessibilityLabel="Buscar activo"
          autoCorrect={false}
          className="flex-1 font-sans text-[15px] text-foreground"
        />
      </View>
      {term ? (
        <View role="list" aria-label="Activos encontrados" className="rounded-2xl border border-border p-1">
          {results.isLoading || (results.isRefreshing && options.length === 0) ? (
            <Text tone="muted" className="p-2.5 text-[13px]">Buscando…</Text>
          ) : options.length === 0 ? (
            <Text tone="muted" className="p-2.5 text-[13px]">No encontramos «{term}».</Text>
          ) : (
            options.map((asset) => (
              <Pressable key={asset.id} role="button" onPress={() => pick(asset)} className="min-h-11 flex-row items-center gap-2.5 rounded-xl px-2.5 active:bg-muted">
                <Text weight="semibold" className="text-sm">{asset.symbol}</Text>
                <Text tone="muted" numberOfLines={1} className="flex-1 text-sm">{displayName(asset.name)}</Text>
                <Text tone="muted" className="text-xs">{ASSET_TYPE_LABEL[asset.type]}</Text>
              </Pressable>
            ))
          )}
        </View>
      ) : (
        <>
          <Text tone="muted" className="text-[13px] leading-5">Busca una acción, un ETF o una cripto por su nombre o su símbolo, o elige una de las tuyas.</Text>
          {positions && positions.length > 0 ? (
            <View role="group" aria-label="Tus activos" className="flex-row flex-wrap gap-1.5">
              {positions.map((position) => (
                <Pressable
                  key={position.assetId}
                  role="button"
                  onPress={() => onPick({ assetId: position.assetId, symbol: position.symbol, name: position.assetName })}
                  className="h-9 justify-center rounded-full border border-border px-3 active:bg-muted"
                >
                  <Text className="text-[13px]">{position.symbol}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
      )}
    </Card>
  )
}
