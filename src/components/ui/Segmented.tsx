import { Pressable, View } from "react-native"
import { Text } from "@/components/ui/Text"

interface SegmentedProps<T extends string> {
  label: string
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

/** Elegir una opcion entre pocas: tema, gasto o ingreso, periodo. */
export function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    // role y aria-* en vez de accessibilityRole/State: React Native Web no traduce accessibilityState a aria-checked.
    <View role="radiogroup" aria-label={label} className="flex-row rounded-full bg-muted p-1">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            role="radio"
            aria-checked={selected}
            className={`h-10 flex-1 items-center justify-center rounded-full ${selected ? "bg-card" : ""}`}
          >
            <Text weight={selected ? "medium" : "regular"} tone={selected ? "default" : "muted"} className="text-sm">
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
