import { useEffect, useState } from "react"
import { Pressable, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Fingerprint } from "lucide-react-native"
import { Button } from "@/components/ui/Button"
import { Notice } from "@/components/ui/Notice"
import { Text, Title } from "@/components/ui/Text"
import { useAuth } from "@/hooks/useAuth"
import { authenticate, biometricSupport } from "@/lib/biometrics"
import { firstName } from "@/lib/format"
import { usePalette } from "@/theme/palette"

/** Pide la huella si se puede. Si se quito la huella del celular despues de activarla, no se queda encerrado. */
async function check(): Promise<{ label: string; ok: boolean }> {
  const support = await biometricSupport()
  const ok = support.available ? await authenticate("Desbloquea Cash-Out") : false
  return { label: support.label, ok }
}

/**
 * La app con sesion guardada pide la huella antes de mostrar tus datos. Si no
 * se puede, se entra con la contraseña: eso cierra la sesion guardada.
 */
export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const colors = usePalette()
  const { user, logout } = useAuth()
  const [label, setLabel] = useState("huella")
  const [failed, setFailed] = useState(false)
  // Empieza ocupada: al abrir ya se esta pidiendo la huella.
  const [busy, setBusy] = useState(true)

  const apply = (result: { label: string; ok: boolean }) => {
    setLabel(result.label)
    setBusy(false)
    if (result.ok) onUnlock()
    else setFailed(true)
  }

  // Al abrir, se pide la huella sin tener que tocar nada.
  useEffect(() => {
    let alive = true
    void check().then((result) => {
      if (!alive) return
      setLabel(result.label)
      setBusy(false)
      if (result.ok) onUnlock()
      else setFailed(true)
    })
    return () => {
      alive = false
    }
  }, [onUnlock])

  const unlock = async () => {
    setBusy(true)
    apply(await check())
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center gap-5 px-8">
        <View className="size-16 items-center justify-center self-center rounded-full bg-accent">
          <Fingerprint size={32} color={colors.accentInk} />
        </View>
        <View className="items-center gap-1.5">
          <Title size="lg" className="text-center">Hola, {firstName(user?.name)}</Title>
          <Text tone="muted" className="text-center text-base">Usa tu {label} para ver tus cuentas.</Text>
        </View>
        {failed ? <Notice>No pudimos confirmar que eres tú. Inténtalo de nuevo o entra con tu contraseña.</Notice> : null}
        <Button label={`Desbloquear con ${label}`} loading={busy} onPress={() => void unlock()} />
        <Pressable role="button" onPress={() => void logout()} className="min-h-11 items-center justify-center">
          <Text weight="medium" tone="muted" className="text-sm">Entrar con mi contraseña</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
