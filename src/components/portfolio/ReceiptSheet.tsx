import { useState } from "react"
import { View } from "react-native"
import * as Clipboard from "expo-clipboard"
import { router } from "expo-router"
import { Button } from "@/components/ui/Button"
import { Sheet } from "@/components/ui/Sheet"
import { Text } from "@/components/ui/Text"
import { useToast } from "@/components/ui/Toast"
import { ORDER_STATUS_LABEL, displayName, formatSignedTokens } from "@/lib/market"
import { orderNumber, receiptLines, receiptText, rejectionTip, signedTokens } from "@/lib/orders"
import type { TradeOrder } from "@/types/market"
import { usePalette } from "@/theme/palette"

interface ReceiptSheetProps {
  order: TradeOrder | null
  name: string | undefined
  onClose: () => void
  /** Abre la orden con la misma operacion: repetirla o intentarla de nuevo. */
  onRepeat: (order: TradeOrder) => void
}

/** El detalle de una orden como comprobante, con lo que se puede hacer despues. */
export function ReceiptSheet({ order, name, onClose, onRepeat }: ReceiptSheetProps) {
  return (
    <Sheet visible={order !== null} onClose={onClose}>
      {order ? <Receipt key={order.id} order={order} name={name && displayName(name)} onClose={onClose} onRepeat={onRepeat} /> : null}
    </Sheet>
  )
}

function Receipt({ order, name, onClose, onRepeat }: { order: TradeOrder; name: string | undefined; onClose: () => void; onRepeat: (order: TradeOrder) => void }) {
  const colors = usePalette()
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  const tokens = signedTokens(order)
  const rejected = order.status === "REJECTED"
  const done = order.status === "EXECUTED"

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(receiptText(order, name))
      setCopied(true)
      toast("Comprobante copiado")
    } catch {
      toast("No pudimos copiar el comprobante")
    }
  }

  return (
    <View className="gap-3.5">
      <View className="gap-1 border-b border-dashed border-border pb-3.5">
        <View className="flex-row items-center justify-between">
          <Text tone="muted" className="text-[11px] uppercase tracking-widest">Comprobante</Text>
          <Text tone="muted" className="text-xs">N.º {orderNumber(order)}</Text>
        </View>
        <Text weight="semibold" className="mt-1 text-lg">{order.side === "BUY" ? "Compra" : "Venta"} de {order.symbol}</Text>
        {name ? <Text tone="muted" numberOfLines={1} className="text-[13px]">{name}</Text> : null}
        <View className="mt-2 flex-row items-center justify-between">
          <Text weight="medium" tone={tokens === null ? "muted" : tokens > 0 ? "gain" : "default"} className="text-[26px]">
            {tokens === null ? "Sin mover fichas" : formatSignedTokens(tokens)}
          </Text>
          <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: done ? `${colors.gain}22` : `${colors.warning}22` }}>
            <Text weight="semibold" tone={done ? "gain" : "warning"} className="text-xs">{ORDER_STATUS_LABEL[order.status]}</Text>
          </View>
        </View>
      </View>

      <View className="gap-2 border-b border-dashed border-border pb-3.5">
        {receiptLines(order).map(([key, value]) => (
          <View key={key} className="flex-row justify-between gap-3">
            <Text tone="muted" className="text-[13px]">{key}</Text>
            <Text className="text-[13px]">{value}</Text>
          </View>
        ))}
      </View>

      {rejected ? (
        <View className="gap-1 rounded-xl border border-warning px-3.5 py-2.5" style={{ backgroundColor: `${colors.warning}14` }}>
          <Text weight="semibold" className="text-[13px]">Por qué no se ejecutó</Text>
          <Text className="text-[13px] leading-5">{order.rejectionReason ?? "El backend no indicó el motivo."}</Text>
          <Text tone="muted" className="mt-1 text-[13px] leading-5">{rejectionTip(order)}</Text>
        </View>
      ) : null}

      <View className="flex-row gap-2">
        <View className="flex-1"><Button label={rejected ? "Intentar de nuevo" : "Repetir orden"} onPress={() => onRepeat(order)} /></View>
        <View className="flex-1">
          <Button
            label="Ver activo"
            variant="outline"
            onPress={() => {
              onClose()
              router.push({ pathname: "/asset/[id]", params: { id: String(order.assetId) } })
            }}
          />
        </View>
      </View>
      <Button label={copied ? "Copiado" : "Copiar comprobante"} variant="outline" onPress={() => void copy()} />
    </View>
  )
}
