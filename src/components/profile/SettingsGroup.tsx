import type { ReactNode } from "react"
import { Pressable, View } from "react-native"
import { ChevronRight, type LucideIcon } from "lucide-react-native"
import { Text } from "@/components/ui/Text"
import { usePalette } from "@/theme/palette"

/** Un grupo de ajustes: el titulo en versalitas y una tarjeta con sus filas. */
export function SettingsGroup({ title, children, danger = false }: { title: string; children: ReactNode; danger?: boolean }) {
  const colors = usePalette()
  return (
    <View className="gap-2">
      <Text accessibilityRole="header" weight="medium" tone="muted" className="px-1 text-[11px] uppercase tracking-widest">{title}</Text>
      {/* El color del tema es una variable: la transparencia del borde va por style, no por clase. */}
      <View className="overflow-hidden rounded-2xl border bg-card" style={{ borderColor: danger ? `${colors.destructive}66` : colors.border }}>{children}</View>
    </View>
  )
}

interface SettingsRowProps {
  icon: LucideIcon
  label: string
  description: string
  /** Un estado corto a la derecha: "Conectado", "Activo". */
  status?: { label: string; on: boolean }
  onPress?: () => void
  first?: boolean
  danger?: boolean
}

/** Una fila que abre un ajuste. Sin onPress es solo informativa (y no lleva flecha). */
export function SettingsRow({ icon: Icon, label, description, status, onPress, first = false, danger = false }: SettingsRowProps) {
  const colors = usePalette()
  const ink = danger ? colors.destructive : colors.accentInk
  return (
    <Pressable
      role={onPress ? "button" : undefined}
      disabled={!onPress}
      onPress={onPress}
      aria-label={`${label}. ${description}${status ? `. ${status.label}` : ""}`}
      className={`min-h-16 flex-row items-center gap-3 py-2.5 pl-4 pr-3.5 active:bg-muted ${first ? "" : "border-t border-border"}`}
    >
      <View className="size-9 items-center justify-center rounded-[11px]" style={{ backgroundColor: danger ? `${colors.destructive}18` : colors.accent }}>
        <Icon size={18} color={ink} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text weight={danger ? "semibold" : "medium"} tone={danger ? "destructive" : "default"} className="text-[15px]">{label}</Text>
        <Text tone="muted" className="text-[13px] leading-[18px]">{description}</Text>
      </View>
      {status ? (
        <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: status.on ? `${colors.gain}1f` : colors.muted }}>
          <Text weight="semibold" tone={status.on ? "gain" : "muted"} className="text-xs">{status.label}</Text>
        </View>
      ) : null}
      {onPress && !danger ? <ChevronRight size={18} color={colors.mutedForeground} /> : null}
    </Pressable>
  )
}
