import { useCallback, useEffect, useRef, useState } from "react"
import { AppState, View } from "react-native"
import { useFocusEffect } from "expo-router"
import * as WebBrowser from "expo-web-browser"
import { Check, Mail, RefreshCw } from "lucide-react-native"
import { userMessage, toApiError } from "@/api/errors"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Screen } from "@/components/ui/Screen"
import { ErrorState, Skeleton } from "@/components/ui/States"
import { Text } from "@/components/ui/Text"
import { useToast } from "@/components/ui/Toast"
import { useApiQuery } from "@/hooks/useApiQuery"
import { confirmAction } from "@/lib/confirm"
import { formatDateTime } from "@/lib/format"
import { scanMessage } from "@/lib/profile"
import { autoRegisterService } from "@/services/autoRegisterService"
import { usePalette } from "@/theme/palette"

const PRIVACY = [
  "Solo leemos los correos de los bancos, nunca el resto de tu bandeja.",
  "No guardamos el correo: solo el monto, el comercio y la hora del consumo.",
  "Puedes desconectarlo aquí o desde tu cuenta de Google cuando quieras.",
  "¿Tus avisos llegan a otro correo? Cámbialo a tu Gmail en la app de tu banco.",
]

export default function GmailScreen() {
  const colors = usePalette()
  const toast = useToast()
  const status = useApiQuery(["gmail-status"], (signal) => autoRegisterService.gmailStatus(signal))
  const [busy, setBusy] = useState(false)
  // Se abrio Google para dar el permiso: al volver a la app se mira si quedo conectado.
  const waiting = useRef(false)
  const { reload } = status

  useFocusEffect(useCallback(() => reload(), [reload]))
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && waiting.current) reload()
    })
    return () => subscription.remove()
  }, [reload])

  const scan = useCallback(
    async (again: boolean) => {
      setBusy(true)
      try {
        toast(scanMessage(await autoRegisterService.scanGmailMonth(again)))
        reload()
      } catch (err) {
        toast(userMessage(toApiError(err)))
      }
      setBusy(false)
    },
    [reload, toast],
  )

  // Google vuelve a la web, no a la app: cuando el estado pasa a conectado, se pregunta por el mes.
  const connected = status.data?.connected ?? false
  useEffect(() => {
    if (!waiting.current || !connected) return
    waiting.current = false
    void confirmAction({
      title: "¿Traemos tus movimientos de este mes?",
      message: "Gmail quedó conectado. Podemos leer los correos de consumo del BCP desde el día 1, o empezar solo con lo que llegue desde ahora. Igual los confirmas tú en Movimientos.",
      confirmLabel: "Traer este mes",
      cancelLabel: "Solo desde ahora",
    }).then((month) => (month ? scan(false) : toast("Gmail conectado: leeremos los correos que lleguen desde ahora.")))
  }, [connected, scan, toast])

  const connect = async () => {
    setBusy(true)
    try {
      const url = await autoRegisterService.gmailConnectUrl()
      waiting.current = true
      await WebBrowser.openBrowserAsync(url)
      reload()
    } catch (err) {
      waiting.current = false
      toast(userMessage(toApiError(err)))
    }
    setBusy(false)
  }

  const rescan = async () => {
    const ok = await confirmAction({
      title: "¿Volver a revisar el mes?",
      message: "Leemos otra vez los correos del BCP desde el día 1. Lo que descartaste este mes vuelve a Movimientos; lo que ya confirmaste no se repite.",
      confirmLabel: "Revisar el mes",
    })
    if (ok) await scan(true)
  }

  const disconnect = async () => {
    const ok = await confirmAction({
      title: "¿Desconectar Gmail?",
      message: "Dejamos de leer tus correos. Lo que ya está en Movimientos se queda.",
      confirmLabel: "Desconectar",
      destructive: true,
    })
    if (!ok) return
    setBusy(true)
    try {
      await autoRegisterService.disconnectGmail()
      toast("Gmail desconectado: ya no leemos tus correos.")
      reload()
    } catch (err) {
      toast(userMessage(toApiError(err)))
    }
    setBusy(false)
  }

  const data = status.data
  const expired = data?.status === "EXPIRED"
  const live = Boolean(data?.connected && !expired)

  return (
    <Screen back title="Correos del banco" subtitle="Conecta tu Gmail y cada consumo que te avise el BCP aparece en Movimientos para que lo confirmes.">
      {status.error && !data ? (
        <ErrorState error={status.error} onRetry={reload} />
      ) : !data ? (
        <Skeleton height={150} />
      ) : (
        <Card className="gap-3.5">
          <View className="flex-row items-start gap-3">
            <View className="size-10 items-center justify-center rounded-xl" style={{ backgroundColor: live ? `${colors.gain}1f` : colors.muted }}>
              <Mail size={20} color={live ? colors.gain : colors.mutedForeground} />
            </View>
            <View className="flex-1 gap-1">
              <View className="self-start rounded-full px-2.5 py-0.5" style={{ backgroundColor: live ? `${colors.gain}1f` : colors.muted }}>
                <Text weight="semibold" tone={live ? "gain" : "muted"} className="text-xs">
                  {!data.available ? "No disponible" : live ? "Conectado" : expired ? "Permiso vencido" : "Sin conectar"}
                </Text>
              </View>
              <Text className="text-sm leading-5">
                {!data.available
                  ? "La conexión con Gmail no está disponible en este servidor por ahora."
                  : data.connected
                    ? `Conectado como ${data.email}${data.lastCheckedAt ? ` · última lectura ${formatDateTime(data.lastCheckedAt)}` : " · la primera lectura llega en unos minutos"}.`
                    : "Sin conectar: los consumos del BCP no llegan solos a Movimientos."}
              </Text>
            </View>
          </View>
          {data.available && live ? (
            <View className="gap-2">
              <Button label="Volver a revisar el mes" variant="outline" loading={busy} onPress={() => void rescan()} />
              <Button label="Desconectar" variant="outline" disabled={busy} onPress={() => void disconnect()} />
            </View>
          ) : data.available ? (
            <Button label={expired ? "Reconectar Gmail" : "Conectar Gmail"} loading={busy} onPress={() => void connect()} />
          ) : null}
        </Card>
      )}

      <View className="gap-2.5 px-1">
        <Text accessibilityRole="header" weight="medium" tone="muted" className="text-[11px] uppercase tracking-widest">Qué leemos</Text>
        {PRIVACY.map((line) => (
          <View key={line} className="flex-row items-start gap-2.5">
            <Check size={16} color={colors.gain} style={{ marginTop: 2 }} />
            <Text className="flex-1 text-sm leading-5">{line}</Text>
          </View>
        ))}
      </View>
      {busy ? (
        <View className="flex-row items-center gap-2 self-center">
          <RefreshCw size={14} color={colors.mutedForeground} />
          <Text tone="muted" className="text-xs">Un momento…</Text>
        </View>
      ) : null}
    </Screen>
  )
}
