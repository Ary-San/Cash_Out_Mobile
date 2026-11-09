import { useState } from "react"
import { Pressable, TextInput, View } from "react-native"
import { TriangleAlert } from "lucide-react-native"
import { userMessage, toApiError } from "@/api/errors"
import { Button } from "@/components/ui/Button"
import { Sheet } from "@/components/ui/Sheet"
import { Skeleton } from "@/components/ui/States"
import { Text } from "@/components/ui/Text"
import { useToast } from "@/components/ui/Toast"
import { useApiQuery } from "@/hooks/useApiQuery"
import { usePolling } from "@/hooks/usePolling"
import { toCents } from "@/lib/amount"
import { confirmWithBiometrics } from "@/lib/biometrics"
import {
  changeTone,
  formatQuantity,
  formatSignedPercent,
  formatTokens,
  formatUsd,
  parseOrderValue,
  quantityToTokens,
  tokensToQuantity,
  uuid,
} from "@/lib/market"
import { financeService } from "@/services/financeService"
import { marketService } from "@/services/marketService"
import { portfolioService } from "@/services/portfolioService"
import type { OrderSide, TradeOrder } from "@/types/market"
import { usePalette } from "@/theme/palette"
import { TOUCH_SLOP } from "@/lib/touch"
import { haptics } from "@/lib/haptics"

export interface OrderTarget {
  assetId: number
  symbol: string
  name: string
  side: OrderSide
  /** Lo que ya tiene; limita la venta. */
  held: number
}

interface OrderSheetProps {
  target: OrderTarget | null
  onClose: () => void
  onDone: (order: TradeOrder) => void
}

/** Comprar o vender en una hoja: armar la orden, revisarla y confirmarla. */
export function OrderSheet({ target, onClose, onDone }: OrderSheetProps) {
  const [locked, setLocked] = useState(false)
  return (
    <Sheet visible={target !== null} onClose={onClose} locked={locked} title={target ? `Operar ${target.symbol}` : undefined}>
      {target ? <OrderForm key={`${target.assetId}-${target.side}`} target={target} onBusy={setLocked} onDone={onDone} /> : null}
    </Sheet>
  )
}

type Mode = "tokens" | "quantity"

function OrderForm({ target, onBusy, onDone }: { target: OrderTarget; onBusy: (busy: boolean) => void; onDone: (order: TradeOrder) => void }) {
  const colors = usePalette()
  const toast = useToast()
  const [side, setSide] = useState<OrderSide>(target.held > 0 ? target.side : "BUY")
  const buying = side === "BUY"
  const [mode, setMode] = useState<Mode>(buying ? "tokens" : "quantity")
  const [text, setText] = useState("")
  const [fieldError, setFieldError] = useState<string>()
  const [review, setReview] = useState<{ quantity: number; tokens: number }>()
  const [rejection, setRejection] = useState<string>()
  const [placing, setPlacing] = useState(false)
  // El mismo id al reintentar: si la orden si llego, el backend devuelve esa en vez de crear otra.
  const [clientOrderId, setClientOrderId] = useState(uuid)

  const quote = useApiQuery(["quote", target.assetId], (signal) => marketService.getQuote(target.assetId, signal))
  const wallet = useApiQuery(["token-wallet"], (signal) => financeService.wallet(signal))
  usePolling(quote.reload, 15_000)
  const price = quote.data?.price
  const balance = wallet.data?.tokenBalance
  const unit = target.symbol.endsWith("-USD") ? target.symbol.replace(/-USD$/, "") : "acciones"

  const quantityFor = (value: number) => (mode === "tokens" && price ? tokensToQuantity(value, price) : value)
  const typed = Number(text.replace(",", "."))
  let help = buying
    ? balance !== undefined ? `Tienes ${formatTokens(balance)}. Puedes comprar fracciones de acción.` : ""
    : `Tienes ${formatQuantity(target.held)} ${unit}.`
  if (price && typed > 0) {
    const qty = quantityFor(typed)
    const cost = quantityToTokens(qty, price)
    help = buying && mode === "tokens"
      ? `Recibirás ≈ ${formatQuantity(qty)} ${unit} (cuestan ${formatTokens(cost)}).`
      : buying ? `Te costará ≈ ${formatTokens(cost)}.` : `Recibirás ≈ ${formatTokens(cost)}.`
  }

  const switchSide = (next: OrderSide) => {
    if (next === "SELL" && target.held === 0) return
    if (next !== side) haptics.selection()
    setSide(next)
    setMode(next === "BUY" ? "tokens" : "quantity")
    setText("")
    setFieldError(undefined)
    setReview(undefined)
    setRejection(undefined)
  }

  const check = () => {
    if (!price) return setFieldError("Todavía no tenemos el precio. Espera un momento.")
    const parsed = parseOrderValue(text, mode)
    if ("error" in parsed) return setFieldError(parsed.error)
    const quantity = quantityFor(parsed.value)
    const tokens = quantityToTokens(quantity, price)
    if (quantity <= 0 || toCents(tokens) < 1) return setFieldError("La orden tiene que valer al menos 0.01 fichas.")
    if (buying && balance !== undefined && toCents(tokens) > toCents(balance)) return setFieldError(`No te alcanzan las fichas: tienes ${formatTokens(balance)}.`)
    if (!buying && quantity > target.held) return setFieldError(`Solo tienes ${formatQuantity(target.held)} ${unit}.`)
    setRejection(undefined)
    setReview({ quantity, tokens })
  }

  const confirm = async () => {
    if (!review) return
    // Con la biometria activa, una orden con fichas se confirma con la huella.
    if (!(await confirmWithBiometrics(buying ? "Confirma la compra" : "Confirma la venta"))) return
    setPlacing(true)
    onBusy(true)
    try {
      const order = await portfolioService.placeOrder({ clientOrderId, assetId: target.assetId, side, quantity: review.quantity })
      if (order.status === "EXECUTED") {
        haptics.success()
        toast(`${buying ? "Compraste" : "Vendiste"} ${formatQuantity(order.quantity)} ${order.symbol} · ${buying ? "pagaste" : "recibiste"} ${formatTokens(order.tokensMoved)}`)
        onBusy(false)
        onDone(order)
        return
      }
      // Una rechazada ya quedo registrada; el siguiente intento es otra orden.
      haptics.warning()
      setClientOrderId(uuid())
      setRejection(order.rejectionReason ?? "La orden fue rechazada.")
      wallet.reload()
    } catch (err) {
      setRejection(userMessage(toApiError(err)))
    }
    setReview(undefined)
    setPlacing(false)
    onBusy(false)
  }

  const allLabel = buying ? (mode === "tokens" && balance ? "Usar todo" : null) : target.held > 0 ? "Vender todo" : null

  return (
    <View className="gap-3.5">
      <View role="radiogroup" aria-label="Tipo de orden" className="flex-row rounded-full bg-muted p-1">
        {(["BUY", "SELL"] as const).map((value) => {
          const on = side === value
          const disabled = value === "SELL" && target.held === 0
          return (
            <Pressable
              hitSlop={TOUCH_SLOP}
              key={value}
              role="radio"
              aria-checked={on}
              aria-disabled={disabled}
              disabled={disabled}
              onPress={() => switchSide(value)}
              className={`min-h-10 flex-1 items-center justify-center rounded-full ${on ? "bg-card" : ""} ${disabled ? "opacity-40" : ""}`}
            >
              <Text weight={on ? "semibold" : "regular"} tone={on ? "default" : "muted"} className="text-sm">
                {value === "BUY" ? "Comprar" : "Vender"}
              </Text>
            </Pressable>
          )
        })}
      </View>
      {target.held === 0 ? <Text tone="muted" className="-mt-2 text-xs">No tienes {target.symbol}: solo puedes comprar.</Text> : null}

      <View className="flex-row items-center justify-between rounded-xl bg-muted px-3 py-2.5">
        <Text tone="muted" className="text-[13px]">Precio de {target.symbol}</Text>
        {quote.data ? (
          <Text weight="semibold" className="text-[13px]">
            {formatUsd(quote.data.price)}{" "}
            <Text tone={changeTone(quote.data.changePercent)} className="text-xs">{formatSignedPercent(quote.data.changePercent)} hoy</Text>
          </Text>
        ) : quote.error ? (
          <Text tone="destructive" className="text-[13px]">{userMessage(quote.error)}</Text>
        ) : (
          <Skeleton width={110} height={16} />
        )}
      </View>

      {rejection ? (
        <View role="alert" className="flex-row gap-2.5 rounded-xl border border-destructive p-3">
          <TriangleAlert size={16} color={colors.destructive} />
          <Text tone="destructive" className="flex-1 text-[13px] leading-5">{rejection}</Text>
        </View>
      ) : null}

      {review ? (
        <View className="gap-3">
          <View className="rounded-xl border border-dashed border-input p-3.5">
            <Text className="text-sm leading-5">
              Vas a {buying ? "comprar" : "vender"} ≈ {formatQuantity(review.quantity)} {target.symbol} por {formatTokens(review.tokens)}, al precio del momento.
            </Text>
          </View>
          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <Button label="Volver" variant="outline" disabled={placing} onPress={() => setReview(undefined)} />
            </View>
            <View className="flex-1">
              <Button label={buying ? "Confirmar compra" : "Confirmar venta"} loading={placing} onPress={() => void confirm()} />
            </View>
          </View>
        </View>
      ) : (
        <View className="gap-3">
          {buying ? (
            <View role="radiogroup" aria-label="Cómo quieres indicar la compra" className="w-60 flex-row rounded-full bg-muted p-1">
              {(["tokens", "quantity"] as const).map((value) => (
                <Pressable
                  hitSlop={TOUCH_SLOP}
                  key={value}
                  role="radio"
                  aria-checked={mode === value}
                  onPress={() => {
                    setMode(value)
                    setText("")
                    setFieldError(undefined)
                  }}
                  className={`min-h-8 flex-1 items-center justify-center rounded-full ${mode === value ? "bg-card" : ""}`}
                >
                  <Text weight={mode === value ? "semibold" : "regular"} tone={mode === value ? "default" : "muted"} className="text-[13px]">
                    {value === "tokens" ? "En fichas" : unit === "acciones" ? "En acciones" : `En ${unit}`}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View className="gap-1.5">
            <Text weight="medium" className="text-sm">{mode === "tokens" ? "Fichas a invertir" : unit === "acciones" ? "Cantidad de acciones" : `Cantidad de ${unit}`}</Text>
            <View className="flex-row gap-2">
              {/* En web un input no se achica solo: el View con min-w-0 le deja sitio al boton. */}
              <View className="min-w-0 flex-1">
                <TextInput
                  value={text}
                  onChangeText={(value) => {
                    setText(value)
                    setFieldError(undefined)
                  }}
                  keyboardType="decimal-pad"
                  placeholder={mode === "tokens" ? "0.00" : "0.000000"}
                  placeholderTextColor={colors.mutedForeground}
                  accessibilityLabel={mode === "tokens" ? "Fichas a invertir" : "Cantidad"}
                  aria-invalid={Boolean(fieldError)}
                  className={`min-h-14 w-full rounded-xl border bg-card px-4 font-sans-semibold text-xl text-foreground ${fieldError ? "border-destructive" : "border-input"}`}
                />
              </View>
              {allLabel ? (
                <Pressable
                  role="button"
                  onPress={() => {
                    setText(buying ? (Math.floor((balance ?? 0) * 100) / 100).toFixed(2) : String(target.held))
                    setFieldError(undefined)
                  }}
                  className="min-h-14 justify-center rounded-xl bg-muted px-3.5 active:opacity-80"
                >
                  <Text weight="medium" className="text-sm">{allLabel}</Text>
                </Pressable>
              ) : null}
            </View>
            <Text tone={fieldError ? "destructive" : "muted"} className="text-[13px] leading-5">{fieldError ?? help}</Text>
          </View>
          <Text tone="muted" className="text-xs leading-4">Se ejecuta al precio del momento, que puede variar un poco del que ves. 1 ficha = 1 US$.</Text>
          <Button label={buying ? "Revisar compra" : "Revisar venta"} disabled={!price} onPress={check} />
        </View>
      )}
    </View>
  )
}
