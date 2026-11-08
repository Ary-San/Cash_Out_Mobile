import { View } from "react-native"
import { Check, Circle } from "lucide-react-native"
import { Text } from "@/components/ui/Text"
import { passwordRules } from "@/lib/validation"
import { usePalette } from "@/theme/palette"

/** Los requisitos de la contraseña, marcandose mientras se escribe. */
export function PasswordChecklist({ value }: { value: string }) {
  const colors = usePalette()
  return (
    <View accessibilityLabel="Requisitos de la contraseña" className="flex-row flex-wrap gap-y-2 rounded-xl bg-muted px-3.5 py-3">
      {passwordRules.map((rule) => {
        const ok = rule.test(value)
        return (
          <View key={rule.id} className="w-1/2 flex-row items-start gap-1.5 pr-2" accessibilityLabel={`${rule.label}: ${ok ? "cumplido" : "pendiente"}`}>
            {ok ? <Check size={14} color={colors.gain} /> : <Circle size={14} color={colors.mutedForeground} />}
            <Text tone={ok ? "gain" : "muted"} className="flex-1 text-[12.5px]">{rule.label}</Text>
          </View>
        )
      })}
    </View>
  )
}
