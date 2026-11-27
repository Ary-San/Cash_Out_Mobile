import { useState } from "react"
import { View } from "react-native"
import { Laptop, Mail, MapPin, MessageCircle, Smartphone, Zap, type LucideIcon } from "lucide-react-native"
import { toApiError, userMessage } from "@/api/errors"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Screen } from "@/components/ui/Screen"
import { ErrorState, Skeleton } from "@/components/ui/States"
import { Text } from "@/components/ui/Text"
import { useToast } from "@/components/ui/Toast"
import { useApiQuery } from "@/hooks/useApiQuery"
import { confirmAction } from "@/lib/confirm"
import { isPhone, lastActive, sessionSummary } from "@/lib/sessions"
import { sessionService } from "@/services/sessionService"
import { usePalette } from "@/theme/palette"
import type { ConnectionInfo, SessionInfo } from "@/types/sessions"

/**
 * Las sesiones abiertas de la cuenta: dispositivo, distrito aproximado e IP tapada.
 * Si aparece una que no es tuya, se cierra ahi mismo (y deja de entrar en el acto),
 * o se cierran todas las demas de una vez.
 */
export default function SessionsScreen() {
  const colors = usePalette()
  const toast = useToast()
  const sessions = useApiQuery(["sessions"], (signal) => sessionService.list(signal))
  const [busy, setBusy] = useState<string | null>(null)
  const connections = useApiQuery(["connections"], (signal) => sessionService.connections(signal))
  const list = sessions.data ?? []
  const others = list.filter((session) => !session.current).length
  // WhatsApp y el atajo tambien se cortan con "Cerrar todas las demas".
  const cuttable = (connections.data ?? []).filter((connection) => connection.kind !== "GMAIL").length
  const reloadAll = () => {
    sessions.reload()
    connections.reload()
  }

  const close = async (session: SessionInfo) => {
    const ok = await confirmAction({
      title: "¿Cerrar esta sesión?",
      message: `${session.device ?? "Ese dispositivo"}${session.location ? `, ${session.location}` : ""} deja de entrar a tu cuenta en el acto.`,
      confirmLabel: "Cerrar sesión",
      destructive: true,
    })
    if (!ok) return
    setBusy(session.id)
    try {
      await sessionService.close(session.id)
      toast("Sesión cerrada: ese dispositivo ya no puede entrar.")
      sessions.reload()
    } catch (err) {
      toast(userMessage(toApiError(err)))
    }
    setBusy(null)
  }

  const closeOthers = async () => {
    const ok = await confirmAction({
      title: "¿Cerrar todas las demás?",
      message: `Se cierran ${others === 1 ? "la otra sesión" : `las otras ${others} sesiones`} y dejan de entrar en el acto.${cuttable > 0 ? " También se desconectan tu WhatsApp y el atajo de iPhone (luego los vuelves a vincular si eran tuyos)." : ""} Esta queda abierta.`,
      confirmLabel: "Cerrar todas",
      destructive: true,
    })
    if (!ok) return
    setBusy("all")
    try {
      const { closed, connections: cut } = await sessionService.closeOthers()
      toast(`${closed === 1 ? "Cerramos 1 sesión" : `Cerramos ${closed} sesiones`}${cut > 0 ? " y desconectamos tu WhatsApp y el atajo" : ""}.`)
      reloadAll()
    } catch (err) {
      toast(userMessage(toApiError(err)))
    }
    setBusy(null)
  }

  return (
    <Screen back title="Sesiones activas" subtitle="Dónde está abierta tu cuenta. Si ves un dispositivo o un distrito que no reconoces, ciérralo y cambia tu contraseña.">
      {sessions.error && !sessions.data ? (
        <ErrorState error={sessions.error} onRetry={sessions.reload} />
      ) : !sessions.data ? (
        <Skeleton height={180} />
      ) : (
        <>
          {list.map((session) => {
            const Icon = isPhone(session) ? Smartphone : Laptop
            return (
              <Card key={session.id} className="flex-row items-center gap-3">
                <View accessible accessibilityLabel={sessionSummary(session)} className="flex-1 flex-row items-center gap-3">
                  <View className="size-10 items-center justify-center rounded-xl bg-muted">
                    <Icon size={20} color={colors.mutedForeground} />
                  </View>
                  <View className="flex-1 gap-0.5">
                    <Text weight="semibold" className="text-sm">{session.device ?? "Dispositivo desconocido"}</Text>
                    {session.current ? (
                      <Text weight="medium" tone="gain" className="text-xs">Este dispositivo</Text>
                    ) : null}
                    <View className="flex-row items-start gap-1">
                      <MapPin size={13} color={colors.mutedForeground} />
                      <Text tone="muted" className="flex-1 text-[13px] leading-4">{session.location ?? "Ubicación desconocida"}</Text>
                    </View>
                    <Text tone="muted" className="text-xs" style={{ fontVariant: ["tabular-nums"] }}>
                      {session.ip ? `IP ${session.ip} · ` : ""}
                      {session.current ? "Activa ahora" : `Activa ${lastActive(session.lastUsedAt)}`}
                    </Text>
                  </View>
                </View>
                {!session.current ? (
                  <View className="w-24">
                    <Button label="Cerrar" variant="outline" loading={busy === session.id} disabled={busy !== null} onPress={() => void close(session)} />
                  </View>
                ) : null}
              </Card>
            )
          })}
          {connections.data && connections.data.length > 0 ? (
            <>
              <Text weight="semibold" tone="muted" className="mt-1 text-xs uppercase tracking-wide">Conexiones</Text>
              {connections.data.map((connection) => (
                <ConnectionCard key={connection.kind} connection={connection} onClosed={reloadAll} />
              ))}
            </>
          ) : null}
          <Button label="Cerrar todas las demás" variant="outline" loading={busy === "all"} disabled={(others === 0 && cuttable === 0) || busy !== null} onPress={() => void closeOthers()} />
          <Text tone="muted" className="text-xs leading-4">
            El lugar sale de la conexión a internet y es aproximado: con datos móviles puede mostrar un distrito cercano.
          </Text>
        </>
      )}
    </Screen>
  )
}

const CONNECTION_ICON: Record<ConnectionInfo["kind"], LucideIcon> = { WHATSAPP: MessageCircle, SHORTCUT: Zap, GMAIL: Mail }

/**
 * Un acceso que no es una sesion: sobrevive a cerrar las sesiones y a cambiar la
 * contrasena, asi que tambien se ve (y se quita) aqui.
 */
function ConnectionCard({ connection, onClosed }: { connection: ConnectionInfo; onClosed: () => void }) {
  const colors = usePalette()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const Icon = CONNECTION_ICON[connection.kind]

  const remove = async () => {
    const ok = await confirmAction({
      title: `¿Quitar ${connection.label}?`,
      message: "Deja de tener acceso a tu cuenta. Si era tuyo, lo vuelves a vincular cuando quieras.",
      confirmLabel: "Quitar",
      destructive: true,
    })
    if (!ok) return
    setBusy(true)
    try {
      await sessionService.closeConnection(connection.kind)
      toast(`${connection.label} desconectado.`)
      onClosed()
    } catch (err) {
      toast(userMessage(toApiError(err)))
    }
    setBusy(false)
  }

  return (
    <Card className="flex-row items-center gap-3">
      <View className="size-10 items-center justify-center rounded-xl bg-muted">
        <Icon size={20} color={colors.mutedForeground} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text weight="semibold" className="text-sm">{connection.label}</Text>
        <Text tone="muted" numberOfLines={1} className="text-[13px]">{connection.detail}</Text>
        <Text tone="muted" className="text-xs">{connection.lastUsedAt ? `Usado ${lastActive(connection.lastUsedAt)}` : "Sin uso todavía"}</Text>
      </View>
      <View className="w-24">
        <Button label="Quitar" variant="outline" loading={busy} onPress={() => void remove()} />
      </View>
    </Card>
  )
}

