import { Pressable, View } from "react-native"
import { router } from "expo-router"
import { Star } from "lucide-react-native"
import { Text } from "@/components/ui/Text"
import { ASSET_TYPE_LABEL, changeTone, displayName, formatSignedPercent, formatUsd } from "@/lib/market"
import type { Asset, AssetQuote } from "@/types/market"
import { usePalette } from "@/theme/palette"

interface AssetRowProps {
  asset: Asset
  quote: AssetQuote | undefined
  held: boolean
  favorite: boolean
  /** Recibe el activo: asi la lista pasa siempre la misma funcion y las filas que no cambian no se vuelven a dibujar. */
  onToggleFavorite: (asset: Asset) => void
  first?: boolean
}

/** Una fila del mercado: tocarla abre el activo; la estrella lo sigue en Favoritos. */
export function AssetRow({ asset, quote, held, favorite, onToggleFavorite, first = false }: AssetRowProps) {
  const colors = usePalette()
  const change = quote?.changePercent ?? null
  const when = asset.type === "CRYPTO" ? "en 24 h" : "hoy"

  return (
    <View className={`flex-row items-center gap-1 pl-4 pr-1.5 ${first ? "" : "border-t border-border"}`}>
      <Pressable
        role="link"
        aria-label={`${displayName(asset.name)}, ${formatUsd(quote?.price)}, ${formatSignedPercent(change)} ${when}`}
        onPress={() => router.push({ pathname: "/asset/[id]", params: { id: String(asset.id) } })}
        className="min-h-[62px] flex-1 flex-row items-center gap-3 active:opacity-70"
      >
        <View className="size-[38px] items-center justify-center rounded-xl bg-accent">
          <Text weight="semibold" tone="accent" className="text-sm">{asset.symbol[0]}</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text weight="semibold" className="text-[15px]">{asset.symbol}</Text>
            {held ? (
              <View className="rounded-full bg-muted px-2 py-0.5">
                <Text weight="medium" className="text-[11px]">Tienes</Text>
              </View>
            ) : null}
          </View>
          <Text tone="muted" numberOfLines={1} className="text-xs">{displayName(asset.name)} · {ASSET_TYPE_LABEL[asset.type]}</Text>
        </View>
        <View className="items-end">
          <Text weight="semibold" className="text-[15px]">{formatUsd(quote?.price)}</Text>
          <Text weight="semibold" tone={changeTone(change)} className="text-xs">{formatSignedPercent(change)}</Text>
        </View>
      </Pressable>
      <Pressable
        role="button"
        aria-pressed={favorite}
        aria-label={favorite ? `Quitar ${asset.symbol} de favoritos` : `Agregar ${asset.symbol} a favoritos`}
        onPress={() => onToggleFavorite(asset)}
        className="size-11 items-center justify-center"
      >
        <Star size={20} color={favorite ? colors.accentInk : colors.mutedForeground} fill={favorite ? colors.accentInk : "transparent"} />
      </Pressable>
    </View>
  )
}
