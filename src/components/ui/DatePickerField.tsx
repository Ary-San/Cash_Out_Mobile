import { Platform, Pressable, View } from "react-native"
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker"
import { CalendarDays } from "lucide-react-native"
import { Field } from "@/components/ui/Field"
import { Text } from "@/components/ui/Text"
import { parseIsoDate } from "@/lib/dates"
import { formatDate } from "@/lib/format"
import { usePalette } from "@/theme/palette"

const toIso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

interface DatePickerFieldProps {
  label: string
  value: string
  onChange: (iso: string) => void
  /** Fecha que se muestra al abrir el calendario si todavia no hay valor. */
  fallback: string
  min?: string
  max?: string
  error?: string
  hint?: string
}

/**
 * Una fecha con el calendario nativo en Android e iOS. En la vista web no existe,
 * asi que ahi se escribe AAAA-MM-DD.
 */
export function DatePickerField({ label, value, onChange, fallback, min, max, error, hint }: DatePickerFieldProps) {
  const colors = usePalette()
  const current = parseIsoDate(value || fallback)
  const minimumDate = min ? parseIsoDate(min) : undefined
  const maximumDate = max ? parseIsoDate(max) : undefined
  const below = error ? <Text tone="destructive" className="text-sm">{error}</Text> : hint ? <Text tone="muted" className="text-[13px]">{hint}</Text> : null

  if (Platform.OS === "web") {
    return (
      <View className="gap-1.5">
        <Field label={label} placeholder="AAAA-MM-DD" maxLength={10} value={value} onChangeText={onChange} error={error} />
        {!error && hint ? <Text tone="muted" className="text-[13px]">{hint}</Text> : null}
      </View>
    )
  }

  if (Platform.OS === "ios") {
    return (
      <View className="gap-1.5">
        <View className="flex-row items-center justify-between">
          <Text weight="medium" className="text-sm">{label}</Text>
          <DateTimePicker
            value={current}
            mode="date"
            display="compact"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            locale="es-PE"
            onValueChange={(_, date) => onChange(toIso(date))}
          />
        </View>
        {below}
      </View>
    )
  }

  return (
    <View className="gap-1.5">
      <Text weight="medium" className="text-sm">{label}</Text>
      <Pressable
        role="button"
        aria-label={value ? `${label}: ${formatDate(value)}. Cambiar` : `Elegir ${label.toLowerCase()}`}
        onPress={() =>
          DateTimePickerAndroid.open({ value: current, mode: "date", minimumDate, maximumDate, onValueChange: (_, date) => onChange(toIso(date)) })
        }
        className={`min-h-12 flex-row items-center gap-2 rounded-xl border bg-card px-4 ${error ? "border-destructive" : "border-input"}`}
      >
        <CalendarDays size={18} color={colors.mutedForeground} />
        <Text className="text-base">{value ? formatDate(value) : "Elegir fecha"}</Text>
      </Pressable>
      {below}
    </View>
  )
}
