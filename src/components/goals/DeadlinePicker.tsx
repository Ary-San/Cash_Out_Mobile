import { Platform, Pressable, View } from "react-native"
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker"
import { CalendarDays } from "lucide-react-native"
import { Field } from "@/components/ui/Field"
import { Text } from "@/components/ui/Text"
import { addDays, parseIsoDate, todayIso } from "@/lib/dates"
import { formatDate } from "@/lib/format"
import { usePalette } from "@/theme/palette"

const toIso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

interface DeadlinePickerProps {
  value: string
  onChange: (iso: string) => void
  error?: string
}

/**
 * Fecha limite sin tope (el backend solo pide que sea despues de hoy): el calendario nativo
 * en Android e iOS. En la vista web no existe, asi que ahi se escribe AAAA-MM-DD.
 */
export function DeadlinePicker({ value, onChange, error }: DeadlinePickerProps) {
  const colors = usePalette()
  const tomorrow = addDays(todayIso(), 1)
  const current = parseIsoDate(value || tomorrow)
  const minimumDate = parseIsoDate(tomorrow)

  if (Platform.OS === "web") {
    return <Field label="Fecha límite" placeholder="AAAA-MM-DD" maxLength={10} value={value} onChangeText={onChange} error={error} />
  }

  if (Platform.OS === "ios") {
    return (
      <View className="gap-1.5">
        <View className="flex-row items-center justify-between">
          <Text weight="medium" className="text-sm">Fecha límite</Text>
          <DateTimePicker value={current} mode="date" display="compact" minimumDate={minimumDate} locale="es-PE" onValueChange={(_, date) => onChange(toIso(date))} />
        </View>
        {error ? <Text tone="destructive" className="text-sm">{error}</Text> : null}
      </View>
    )
  }

  return (
    <View className="gap-1.5">
      <Text weight="medium" className="text-sm">Fecha límite</Text>
      <Pressable
        role="button"
        aria-label={value ? `Fecha límite: ${formatDate(value)}. Cambiar` : "Elegir la fecha límite"}
        onPress={() =>
          DateTimePickerAndroid.open({ value: current, mode: "date", minimumDate, onValueChange: (_, date) => onChange(toIso(date)) })
        }
        className={`h-12 flex-row items-center gap-2 rounded-xl border bg-card px-4 ${error ? "border-destructive" : "border-input"}`}
      >
        <CalendarDays size={18} color={colors.mutedForeground} />
        <Text className="text-base">{value ? formatDate(value) : "Elegir fecha"}</Text>
      </Pressable>
      {error ? <Text tone="destructive" className="text-sm">{error}</Text> : null}
    </View>
  )
}
