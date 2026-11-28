import { useCallback, useRef, useState } from "react"
import { Linking, View } from "react-native"
import { router, useFocusEffect } from "expo-router"
import { HandCoins } from "lucide-react-native"
import { toApiError, userMessage } from "@/api/errors"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Screen } from "@/components/ui/Screen"
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States"
import { Text } from "@/components/ui/Text"
import { useToast } from "@/components/ui/Toast"
import { useApiQuery } from "@/hooks/useApiQuery"
import { confirmAction } from "@/lib/confirm"
import { formatSoles } from "@/lib/format"
import { balanceText } from "@/lib/splits"
import { splitService } from "@/services/splitService"
import type { SplitBalance, SplitBill } from "@/types/splits"

const DAY = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", timeZone: "UTC" })

/**
 * Las cuentas divididas con personas de fuera de la app: cuanto me debe (o le debo)
 * cada una, "Me pagó" y el recordatorio por WhatsApp.
 */
export default function SplitBillsScreen() {
  const toast = useToast()
  const bills = useApiQuery(["split-bills"], (signal) => splitService.list(signal))
  const balances = useApiQuery(["split-balances"], (signal) => splitService.balances(signal))
  const [busy, setBusy] = useState<string | null>(null)
  const reload = useCallback(() => {
    bills.reload()
    balances.reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Al volver de crear una cuenta, la lista tiene que mostrarla. El primer foco ya trae la carga inicial.
  const firstFocus = useRef(true)
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) firstFocus.current = false
      else reload()
    }, [reload]),
  )

  const act = async (key: string, action: () => Promise<unknown>, done: string) => {
    setBusy(key)
    try {
      await action()
      toast(done)
      reload()
    } catch (err) {
      toast(userMessage(toApiError(err)))
    }
    setBusy(null)
  }

  const remove = async (bill: SplitBill) => {
    const ok = await confirmAction({
      title: "¿Borrar esta cuenta?",
      message: "Se borra la cuenta y sus partes. Los gastos y reembolsos ya anotados se quedan en tus movimientos.",
      confirmLabel: "Borrar",
      destructive: true,
    })
    if (ok) await act(`delete-${bill.id}`, () => splitService.remove(bill.id), "Cuenta borrada")
  }

  const list = bills.data ?? []
  const open = list.filter((b) => b.pending > 0)
  const closed = list.filter((b) => b.pending === 0)

  return (
    <Screen
      title="Cuentas compartidas"
      subtitle="Quién te debe y a quién le debes"
      back
      onRefresh={reload}
      refreshing={bills.isRefreshing}
    >
      <Button label="Nueva cuenta" onPress={() => router.push("/split-new")} />
      {bills.error ? <ErrorState error={bills.error} onRetry={reload} /> : null}
      {bills.isLoading ? <Skeleton height={160} /> : null}
      {bills.data && list.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="Todavía no divides ninguna cuenta"
          message="Crea una aquí o abre un gasto y toca «Dividir este gasto». Te dejamos el recordatorio listo para WhatsApp."
        />
      ) : null}
      {balances.data && balances.data.length > 0 ? <Balances balances={balances.data} /> : null}
      {open.length > 0 ? (
        <Text weight="semibold" className="text-[15px]">Con algo pendiente ({open.length})</Text>
      ) : null}
      {open.map((bill) => (
        <BillCard key={bill.id} bill={bill} busy={busy} act={act} onDelete={() => void remove(bill)} />
      ))}
      {closed.length > 0 ? (
        <Text weight="semibold" tone="muted" className="text-[15px]">Saldadas ({closed.length})</Text>
      ) : null}
      {closed.map((bill) => (
        <BillCard key={bill.id} bill={bill} busy={busy} act={act} onDelete={() => void remove(bill)} />
      ))}
    </Screen>
  )
}

function Balances({ balances }: { balances: SplitBalance[] }) {
  return (
    <Card className="gap-1 p-5">
      <Text weight="semibold" className="text-[15px]">Por persona</Text>
      {balances.map((b, index) => (
        <View
          key={`${b.name}-${b.phone ?? ""}`}
          className={`min-h-12 flex-row items-center gap-3 py-2 ${index > 0 ? "border-t border-border" : ""}`}
          accessible={!b.reminderUrl}
          accessibilityLabel={`${b.name}: ${balanceText(b)}`}
        >
          <View className="flex-1">
            <Text weight="semibold" className="text-sm">{b.name}</Text>
            <Text tone={b.net > 0 ? "income" : b.net < 0 ? "destructive" : "muted"} className="text-[13px]">{balanceText(b)}</Text>
          </View>
          {b.reminderUrl ? (
            <Button
              label="Recordar"
              variant="outline"
              onPress={() => void Linking.openURL(b.reminderUrl as string)}
            />
          ) : null}
        </View>
      ))}
    </Card>
  )
}

function BillCard({
  bill,
  busy,
  act,
  onDelete,
}: {
  bill: SplitBill
  busy: string | null
  act: (key: string, action: () => Promise<unknown>, done: string) => Promise<void>
  onDelete: () => void
}) {
  const payer = bill.parts.find((p) => p.payer)
  return (
    <Card className="gap-3 p-5">
      <View>
        <Text weight="semibold" className="text-[15px]">{bill.title}</Text>
        <Text tone="muted" className="text-xs">
          {DAY.format(new Date(`${bill.date}T00:00:00Z`))} · {bill.categoryName} · Total {formatSoles(bill.total)} · Tu parte {formatSoles(bill.myShare)}
        </Text>
      </View>
      {bill.paidByMe ? (
        bill.parts.map((part) => {
          const key = `part-${part.id}`
          const paid = part.status === "PAID"
          return (
            <View key={part.id} className="gap-2 border-t border-border pt-3">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="flex-1 text-sm">
                  <Text weight="semibold" className="text-sm">{part.name}</Text> {formatSoles(part.share)}
                </Text>
                {paid ? <Text tone="income" className="text-[13px]">Pagó</Text> : null}
              </View>
              <View className="flex-row flex-wrap gap-2">
                {paid ? (
                  <Button
                    label="Deshacer"
                    variant="outline"
                    loading={busy === key}
                    onPress={() => void act(key, () => splitService.setPaid(bill.id, part.id, false), `${part.name} vuelve a pendiente`)}
                  />
                ) : (
                  <>
                    {part.share > 0 ? (
                      <Button
                        label="Me pagó"
                        loading={busy === key}
                        onPress={() => void act(key, () => splitService.setPaid(bill.id, part.id, true), `Anotamos el reembolso de ${part.name}`)}
                      />
                    ) : null}
                    {part.reminderUrl ? (
                      <Button label="Recordar por WhatsApp" variant="outline" onPress={() => void Linking.openURL(part.reminderUrl as string)} />
                    ) : null}
                  </>
                )}
              </View>
            </View>
          )
        })
      ) : (
        <View className="gap-2 border-t border-border pt-3">
          <Text className="text-sm">
            Pagó <Text weight="semibold" className="text-sm">{payer?.name ?? "otra persona"}</Text>.{" "}
            {bill.settled ? "Ya le devolviste tu parte." : `Le debes ${formatSoles(bill.myShare)}.`}
          </Text>
          <Button
            label={bill.settled ? "Deshacer" : "Ya le pagué mi parte"}
            variant={bill.settled ? "outline" : "primary"}
            loading={busy === `bill-${bill.id}`}
            onPress={() =>
              void act(
                `bill-${bill.id}`,
                () => splitService.setSettled(bill.id, !bill.settled),
                bill.settled ? "Tu parte vuelve a pendiente" : "Anotamos tu parte como gasto",
              )
            }
          />
        </View>
      )}
      <Button label="Borrar cuenta" variant="outline" loading={busy === `delete-${bill.id}`} onPress={onDelete} />
    </Card>
  )
}
