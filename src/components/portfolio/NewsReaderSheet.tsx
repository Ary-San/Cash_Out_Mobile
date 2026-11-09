import { Linking, Pressable, View } from "react-native"
import { router } from "expo-router"
import { Button } from "@/components/ui/Button"
import { Sheet } from "@/components/ui/Sheet"
import { Text } from "@/components/ui/Text"
import { changeTone, displayName, formatSignedPercent } from "@/lib/market"
import { formatNewsStamp, sourceLabel } from "@/lib/news"
import type { NewsAsset, NewsItem } from "@/types/news"
import { TOUCH_SLOP } from "@/lib/touch"

interface NewsReaderSheetProps {
  news: NewsItem | null
  heldIds: number[]
  saved: boolean
  onToggleSave: (news: NewsItem) => void
  onTrade: (asset: NewsAsset) => void
  onClose: () => void
}

/** Una noticia abierta: su resumen, los activos que nombra y el enlace a la nota completa. */
export function NewsReaderSheet({ news, heldIds, saved, onToggleSave, onTrade, onClose }: NewsReaderSheetProps) {
  return (
    <Sheet visible={news !== null} onClose={onClose}>
      {news ? (
        <View className="gap-3">
          <Text tone="muted" className="text-xs">{sourceLabel(news.source)} · {formatNewsStamp(news)} · en inglés</Text>
          <Text weight="semibold" className="text-xl leading-7">{news.headline}</Text>
          <Text className="text-[15px] leading-6">
            {news.summary || "Esta nota no trae resumen. Ábrela para leerla completa."}
          </Text>

          {news.assets.length > 0 ? (
            <View>
              <Text tone="muted" className="mb-1 text-[11px] uppercase tracking-widest">Activos de la noticia</Text>
              {news.assets.map((asset) => (
                <View key={asset.assetId} className="min-h-14 flex-row items-center gap-2.5 border-t border-border">
                  <Pressable
                    role="link"
                    onPress={() => {
                      onClose()
                      router.push({ pathname: "/asset/[id]", params: { id: String(asset.assetId) } })
                    }}
                    className="flex-1 flex-row items-center gap-2 active:opacity-70"
                  >
                    <Text weight="medium" className="text-sm">{asset.symbol}</Text>
                    {heldIds.includes(asset.assetId) ? (
                      <View className="rounded-full bg-muted px-2 py-0.5"><Text weight="medium" className="text-[11px]">Tienes</Text></View>
                    ) : null}
                    <Text tone="muted" numberOfLines={1} className="flex-1 text-xs">{displayName(asset.name)}</Text>
                    <Text weight="semibold" tone={changeTone(asset.changePercent)} className="text-xs">{formatSignedPercent(asset.changePercent)}</Text>
                  </Pressable>
                  <Pressable hitSlop={TOUCH_SLOP} role="button" onPress={() => onTrade(asset)} className="min-h-9 justify-center rounded-full bg-primary px-3.5 active:opacity-80">
                    <Text weight="medium" className="text-[13px] text-primary-foreground">Comprar</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          <View className="flex-row gap-2">
            <View className="flex-1"><Button label={saved ? "Guardada" : "Guardar"} variant="outline" onPress={() => onToggleSave(news)} /></View>
            {news.url ? (
              <View className="flex-1">
                <Button label={`Leer en ${sourceLabel(news.source)}`} variant="outline" onPress={() => void Linking.openURL(news.url!)} />
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
    </Sheet>
  )
}
