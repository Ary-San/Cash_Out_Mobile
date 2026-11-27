import { useCallback, useEffect, useState } from "react"
import { useTwoFactorPrompt } from "@/components/auth/TwoFactorPrompt"
import { Linking, View } from "react-native"
import { useFocusEffect } from "expo-router"
import { toApiError, userMessage } from "@/api/errors"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Screen } from "@/components/ui/Screen"
import { ErrorState, Skeleton } from "@/components/ui/States"
import { Text } from "@/components/ui/Text"
import { useToast } from "@/components/ui/Toast"
import { useApiQuery } from "@/hooks/useApiQuery"
import { confirmAction } from "@/lib/confirm"
import { haptics } from "@/lib/haptics"
import { WHATSAPP_COMMANDS, WHATSAPP_EXAMPLES, formatCountdown, formatPhone, secondsLeft, waLink } from "@/lib/whatsapp"
import { whatsappService } from "@/services/whatsappService"
import { usePalette } from "@/theme/palette"
import type { WhatsAppStatus } from "@/types/whatsapp"

/** Cada cuanto se pregunta si ya llego el codigo, mientras esta pantalla esta abierta. */
const POLL_MS = 4000

/** Vincular WhatsApp: escribes tus gastos por chat y Cash-Out los anota. */
export default function WhatsAppScreen() {
  const { ask: askCode, sheet: codeSheet } = useTwoFactorPrompt()
  const toast = useToast()
  const status = useApiQuery(["whatsapp"], (signal) => whatsappService.status(signal))
  const [fresh, setFresh] = useState<WhatsAppStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [focused, setFocused] = useState(true)

  // Lo ultimo que se sabe: lo que devolvio "vincular" manda hasta que el estado lo alcanza.
  const data = status.data && (!fresh || status.data.linked || status.data.code === fresh.code) ? status.data : (fresh ?? status.data)
  const left = data?.code ? secondsLeft(data.codeExpiresAt, now) : 0
  const waiting = !!data && !data.linked && left > 0

  useFocusEffect(
    useCallback(() => {
      setFocused(true)
      return () => setFocused(false)
    }, []),
  )

  // Mientras hay un codigo vigente: la cuenta regresiva y preguntar si ya llego.
  const reload = status.reload
  useEffect(() => {
    if (!waiting || !focused) return
    const tick = setInterval(() => setNow(Date.now()), 1000)
    const poll = setInterval(reload, POLL_MS)
    return () => {
      clearInterval(tick)
      clearInterval(poll)
    }
  }, [waiting, focused, reload])

  // Se vinculo mientras esperabamos: se marca al dibujar y se avisa una vez, en un efecto.
  const [announced, setAnnounced] = useState(false)
  if (data?.linked && fresh && !announced) setAnnounced(true)
  useEffect(() => {
    if (!announced) return
    haptics.success()
    toast("¡Listo! Tu WhatsApp quedó vinculado.")
  }, [announced, toast])

  const open = async (url: string) => {
    try {
      await Linking.openURL(url)
    } catch {
      toast("No pudimos abrir WhatsApp. ¿Lo tienes instalado?")
    }
  }

  const link = async () => {
    // Un numero vinculado sobrevive a cerrar las sesiones: con 2FA, pide el codigo.
    const code = await askCode("vincular tu WhatsApp")
    if (code === null) return
    setBusy(true)
    try {
      setFresh(await whatsappService.link(code))
      setAnnounced(false)
      setNow(Date.now())
      status.reload()
    } catch (err) {
      toast(userMessage(toApiError(err)))
    }
    setBusy(false)
  }

  const unlink = async () => {
    const ok = await confirmAction({
      title: "¿Desvincular WhatsApp?",
      message: "Tus mensajes dejarán de registrarse en Cash-Out. Lo ya anotado se queda.",
      confirmLabel: "Desvincular",
      destructive: true,
    })
    if (!ok) return
    setBusy(true)
    try {
      await whatsappService.unlink()
      setFresh(null)
      toast("WhatsApp desvinculado.")
      status.reload()
    } catch (err) {
      toast(userMessage(toApiError(err)))
    }
    setBusy(false)
  }

  return (
    <Screen back title="WhatsApp" subtitle="Escribe tus gastos como le escribirías a un amigo y Cash-Out los anota solo.">
      {status.error && !data ? (
        <ErrorState error={status.error} onRetry={status.reload} />
      ) : !data ? (
        <Skeleton height={150} />
      ) : data.linked ? (
        <Card className="gap-3">
          <StatusPill on label="Vinculado" />
          <Text className="text-[15px]">
            Tu número <Text weight="semibold" className="text-[15px]">{data.phone}</Text> ya registra en Cash-Out.
          </Text>
          <Button label="Abrir el chat de Cash-Out" onPress={() => void open(waLink(data.number, "AYUDA"))} />
          <Button label="Desvincular" variant="outline" disabled={busy} onPress={() => void unlink()} />
        </Card>
      ) : (
        <Card className="gap-4">
          <StatusPill on={false} label="Sin vincular" />
          {data.joinText ? (
            <Step number={1} title="Únete al chat de prueba" body={`Manda «${data.joinText}» al ${formatPhone(data.number)}. Es una sola vez: así lo pide el servicio de prueba de WhatsApp.`}>
              <Button label="Mandar el mensaje" variant="outline" onPress={() => void open(waLink(data.number, data.joinText!))} />
            </Step>
          ) : null}
          <Step
            number={data.joinText ? 2 : 1}
            title="Vincula tu número"
            body="Te damos un código. Al mandarlo desde tu WhatsApp, confirmamos que el número es tuyo."
          >
            {waiting ? (
              <View className="gap-2.5">
                <View className="items-center gap-1 rounded-xl border-[1.5px] border-dashed border-accent-ink p-3">
                  <Text selectable weight="semibold" className="text-2xl tracking-widest" style={{ fontVariant: ["tabular-nums"] }}>{data.code}</Text>
                  <Text role="timer" tone="muted" className="text-xs">Vence en {formatCountdown(left)}</Text>
                </View>
                <Button label="Mandar el código por WhatsApp" onPress={() => void open(waLink(data.number, data.code!))} />
                <Text role="status" tone="muted" className="text-center text-[13px]">Esperando tu mensaje…</Text>
              </View>
            ) : (
              <Button label={data.code ? "Pedir otro código" : "Vincular"} loading={busy} onPress={() => void link()} />
            )}
          </Step>
        </Card>
      )}

      <View className="gap-2.5 px-1">
        <Text accessibilityRole="header" weight="medium" tone="muted" className="text-[11px] uppercase tracking-widest">Cómo escribirle</Text>
        {WHATSAPP_EXAMPLES.map((example) => (
          <Text key={example} className="text-sm">«{example}»</Text>
        ))}
        <Text tone="muted" className="text-[13px] leading-5">Cada movimiento se anota al toque y gana fichas, como en la app.</Text>
        {WHATSAPP_COMMANDS.map(({ command, meaning }) => (
          <Text key={command} className="text-sm leading-5">
            <Text weight="semibold" className="text-sm">{command}</Text> · {meaning}
          </Text>
        ))}
      </View>
      {codeSheet}
    </Screen>
  )
}

function StatusPill({ on, label }: { on: boolean; label: string }) {
  const colors = usePalette()
  return (
    <View className="self-start rounded-full px-2.5 py-0.5" style={{ backgroundColor: on ? `${colors.gain}1f` : colors.muted }}>
      <Text weight="semibold" tone={on ? "gain" : "muted"} className="text-xs">{label}</Text>
    </View>
  )
}

function Step({ number, title, body, children }: { number: number; title: string; body: string; children: React.ReactNode }) {
  return (
    <View className="gap-2.5">
      <View className="flex-row items-start gap-3">
        <View className="size-6 items-center justify-center rounded-full bg-accent">
          <Text weight="semibold" tone="accent" className="text-xs">{number}</Text>
        </View>
        <View className="flex-1 gap-0.5">
          <Text weight="semibold" className="text-[15px]">{title}</Text>
          <Text tone="muted" className="text-[13px] leading-5">{body}</Text>
        </View>
      </View>
      {children}
    </View>
  )
}
