import { Pressable, View } from "react-native"
import { CircleDot, Plus, ScanLine, type LucideIcon } from "lucide-react-native"
import { Card } from "@/components/ui/Card"
import { Text, Title } from "@/components/ui/Text"
import { usePalette } from "@/theme/palette"

interface Action {
  label: string
  icon: LucideIcon
  onPress: () => void
}

/** Las acciones de todos los dias, con texto y a mano del pulgar. La primera es la principal. */
export function QuickActions({ actions }: { actions: Action[] }) {
  const colors = usePalette()
  return (
    <View className="flex-row gap-2">
      {actions.map(({ label, icon: Icon, onPress }, i) => (
        <Pressable
          key={label}
          role="button"
          onPress={onPress}
          className={`h-[52px] flex-1 flex-row items-center justify-center gap-1.5 rounded-full active:opacity-80 ${
            i === 0 ? "bg-primary" : "border border-border bg-card"
          }`}
        >
          <Icon size={18} color={i === 0 ? colors.background : colors.foreground} />
          <Text weight="medium" tone={i === 0 ? "inverse" : "default"} className="text-sm">{label}</Text>
        </Pressable>
      ))}
    </View>
  )
}

export const ACTION_ICONS = { register: Plus, scan: ScanLine, contribute: CircleDot }

/** Fichas del simulador en un chip aparte y sin "S/": no son dinero. */
export function TokenChip({ balance }: { balance: number }) {
  const colors = usePalette()
  return (
    <View
      accessible
      accessibilityLabel={`${balance} fichas para el simulador`}
      className="h-9 flex-row items-center gap-1.5 rounded-full border border-border bg-card px-3"
    >
      <CircleDot size={16} color={colors.accentInk} />
      <Text weight="medium" className="text-[13px]">{balance} fichas</Text>
    </View>
  )
}

const STEPS = [
  { title: "Registra tu primer gasto", hint: "Escribe \"almuerzo 15\" o escanea una boleta" },
  { title: "Anota lo que recibes", hint: "Mesada, sueldo o un trabajo extra" },
  { title: "Crea una meta de ahorro", hint: "Lo apartado no cuenta como disponible" },
]

/** Una cuenta sin movimientos: que hacer primero, en vez de tarjetas vacias. */
export function FirstSteps() {
  return (
    <Card className="gap-3.5 p-5">
      <Title size="md">Empieza por aquí</Title>
      <Text tone="muted" className="text-sm leading-5">
        Cuando registres movimientos vas a ver cómo va tu mes, en qué gastas y cómo avanzan tus metas.
      </Text>
      {STEPS.map((step, i) => (
        <View key={step.title} className="min-h-12 flex-row items-center gap-3">
          <View className="size-7 items-center justify-center rounded-full bg-accent">
            <Text weight="semibold" tone="accent" className="text-[13px]">{i + 1}</Text>
          </View>
          <View className="flex-1">
            <Text weight="medium" className="text-[15px]">{step.title}</Text>
            <Text tone="muted" className="text-[13px]">{step.hint}</Text>
          </View>
        </View>
      ))}
    </Card>
  )
}
