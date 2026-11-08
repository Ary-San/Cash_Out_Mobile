import { DatePickerField } from "@/components/ui/DatePickerField"
import { addDays, todayIso } from "@/lib/dates"

interface DeadlinePickerProps {
  value: string
  onChange: (iso: string) => void
  error?: string
}

/** Fecha limite sin tope: el backend solo pide que sea despues de hoy. */
export function DeadlinePicker({ value, onChange, error }: DeadlinePickerProps) {
  const tomorrow = addDays(todayIso(), 1)
  return <DatePickerField label="Fecha límite" value={value} onChange={onChange} fallback={tomorrow} min={tomorrow} error={error} />
}
