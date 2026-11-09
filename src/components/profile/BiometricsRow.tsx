import { useEffect, useState } from "react"
import { Switch, View } from "react-native"
import { Fingerprint } from "lucide-react-native"
import { Text } from "@/components/ui/Text"
import { useToast } from "@/components/ui/Toast"
import { authenticate, biometricSupport, useBiometricsPreference, type BiometricSupport } from "@/lib/biometrics"
import { usePalette } from "@/theme/palette"

/** "Entrar con huella": solo se puede activar si el celular tiene lector y una huella registrada. */
export function BiometricsRow() {
  const colors = usePalette()
  const toast = useToast()
  const [enabled, setEnabled] = useBiometricsPreference()
  const [support, setSupport] = useState<BiometricSupport | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    void biometricSupport().then((result) => {
      if (alive) setSupport(result)
    })
    return () => {
      alive = false
    }
  }, [])

  const label = support?.label ?? "huella"
  const usable = support?.available ?? false

  const toggle = async (next: boolean) => {
    if (!next) {
      setEnabled(false)
      toast(`Ya no pediremos tu ${label} al abrir la app.`)
      return
    }
    // Se confirma una vez antes de activarla, para no dejar la app cerrada con algo que no funciona.
    setBusy(true)
    const ok = await authenticate(`Activa el ingreso con ${label}`)
    setBusy(false)
    if (!ok) return
    setEnabled(true)
    toast(`Listo: la app te pedirá tu ${label} al abrirla.`)
  }

  return (
    <View className="min-h-16 flex-row items-center gap-3 border-t border-border py-2.5 pl-4 pr-3.5">
      <View className="size-9 items-center justify-center rounded-[11px] bg-accent">
        <Fingerprint size={18} color={colors.accentInk} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text weight="medium" className="text-[15px]">Entrar con {label}</Text>
        <Text tone="muted" className="text-[13px] leading-[18px]">
          {support === null
            ? "Revisando tu celular…"
            : usable
              ? "La pide al abrir la app y al confirmar órdenes o eliminar la cuenta."
              : support.reason}
        </Text>
      </View>
      <Switch
        accessibilityLabel={`Entrar con ${label}`}
        value={enabled && usable}
        disabled={!usable || busy}
        onValueChange={(next) => void toggle(next)}
        trackColor={{ true: colors.accentInk, false: colors.muted }}
      />
    </View>
  )
}
