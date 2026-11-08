import { useState } from "react"
import { View } from "react-native"
import * as Clipboard from "expo-clipboard"
import { userMessage, toApiError } from "@/api/errors"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Screen } from "@/components/ui/Screen"
import { ErrorState, Skeleton } from "@/components/ui/States"
import { Text } from "@/components/ui/Text"
import { useToast } from "@/components/ui/Toast"
import { API_URL } from "@/config"
import { useApiQuery } from "@/hooks/useApiQuery"
import { confirmAction } from "@/lib/confirm"
import { formatDateTime } from "@/lib/format"
import { autoRegisterService } from "@/services/autoRegisterService"
import { usePalette } from "@/theme/palette"

const INGEST_URL = `${API_URL}/ingest`

const STEPS = [
  "En el iPhone, abre Atajos › Automatización › nueva › Transacción (Wallet) y elige tus tarjetas.",
  `Agrega la acción «Obtener contenido de URL» con método POST a ${INGEST_URL}.`,
  "Encabezado X-Cashout-Token con tu token y, en el cuerpo JSON: source = SHORTCUT, text = «Comercio Monto con tarjeta» y externalId = la fecha actual en segundos.",
  "Desactiva «Preguntar antes de ejecutar». Desde ahí, cada pago con Apple Pay llega a Movimientos.",
]

export default function ShortcutScreen() {
  const colors = usePalette()
  const toast = useToast()
  const status = useApiQuery(["ingest-token"], (signal) => autoRegisterService.tokenStatus(signal))
  const [fresh, setFresh] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const data = status.data

  const issue = async () => {
    if (data?.active) {
      const ok = await confirmAction({
        title: "¿Cambiar el token?",
        message: "El token actual deja de funcionar: tendrás que pegar el nuevo en el atajo.",
        confirmLabel: "Cambiar token",
      })
      if (!ok) return
    }
    setBusy(true)
    try {
      setFresh((await autoRegisterService.newToken()).token)
      setCopied(false)
      status.reload()
    } catch (err) {
      toast(userMessage(toApiError(err)))
    }
    setBusy(false)
  }

  const revoke = async () => {
    const ok = await confirmAction({
      title: "¿Revocar el token?",
      message: "El atajo deja de registrar tus pagos. Puedes crear otro cuando quieras.",
      confirmLabel: "Revocar",
      destructive: true,
    })
    if (!ok) return
    setBusy(true)
    try {
      await autoRegisterService.revokeToken()
      setFresh(null)
      toast("Token revocado: el atajo ya no puede registrar pagos.")
      status.reload()
    } catch (err) {
      toast(userMessage(toApiError(err)))
    }
    setBusy(false)
  }

  const copy = async () => {
    if (!fresh) return
    try {
      await Clipboard.setStringAsync(fresh)
      setCopied(true)
      toast("Token copiado: pégalo en el atajo de iPhone.")
    } catch {
      toast("No pudimos copiarlo: selecciónalo y cópialo a mano.")
    }
  }

  return (
    <Screen back title="Atajo de iPhone" subtitle="Cuando pagas con Apple Pay, un atajo avisa a Cash-Out y el pago aparece en Movimientos para que lo confirmes.">
      {status.error && !data ? (
        <ErrorState error={status.error} onRetry={status.reload} />
      ) : !data ? (
        <Skeleton height={130} />
      ) : (
        <Card className="gap-3.5">
          <View className="flex-row flex-wrap items-center gap-2.5">
            <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: data.active ? `${colors.gain}1f` : colors.muted }}>
              <Text weight="semibold" tone={data.active ? "gain" : "muted"} className="text-xs">{data.active ? "Activo" : "Sin token"}</Text>
            </View>
            <Text tone="muted" className="flex-1 text-[13px]">
              {data.active
                ? `Creado el ${formatDateTime(data.createdAt)}${data.lastUsedAt ? ` · último pago ${formatDateTime(data.lastUsedAt)}` : " · todavía no registró pagos"}`
                : "Nadie puede registrar pagos por ti."}
            </Text>
          </View>

          {fresh ? (
            <View className="gap-2 rounded-xl border-[1.5px] border-dashed border-warning p-3">
              <Text weight="semibold" className="text-[13px]">Tu token: cópialo ahora, no lo volveremos a mostrar</Text>
              <View className="flex-row items-center gap-2">
                {/* El token no tiene espacios: sin break-all empujaria el boton fuera de la pantalla. */}
                <Text selectable className="min-w-0 flex-1 break-all rounded-lg bg-muted p-2.5 text-[13px]">{fresh}</Text>
                <View className="w-28 shrink-0"><Button label={copied ? "Copiado" : "Copiar"} variant="outline" onPress={() => void copy()} /></View>
              </View>
            </View>
          ) : null}

          <View className="gap-2">
            <Button label={data.active ? "Cambiar token" : "Crear token"} loading={busy} onPress={() => void issue()} />
            {data.active ? <Button label="Revocar token" variant="outline" disabled={busy} onPress={() => void revoke()} /> : null}
          </View>
        </Card>
      )}

      <View className="gap-3 px-1">
        <Text accessibilityRole="header" weight="medium" tone="muted" className="text-[11px] uppercase tracking-widest">Cómo configurarlo</Text>
        {STEPS.map((step, i) => (
          <View key={step} className="flex-row items-start gap-3">
            <View className="size-6 items-center justify-center rounded-full bg-accent">
              <Text weight="semibold" tone="accent" className="text-xs">{i + 1}</Text>
            </View>
            <Text className="flex-1 text-sm leading-5">{step}</Text>
          </View>
        ))}
        <Text tone="muted" className="text-[13px] leading-5">Solo funciona en iPhone con Apple Pay. En Android, usa los correos del banco.</Text>
      </View>
    </Screen>
  )
}
