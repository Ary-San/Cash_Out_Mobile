import { useState } from "react"
import { router, useLocalSearchParams } from "expo-router"
import { MovementForm } from "@/components/movements/MovementForm"
import { Screen } from "@/components/ui/Screen"
import { Segmented } from "@/components/ui/Segmented"
import { useToast } from "@/components/ui/Toast"
import { expenseService } from "@/services/expenseService"
import { incomeService } from "@/services/incomeService"
import type { ExpenseInput, IncomeInput } from "@/types/movements"

type Kind = "EXPENSE" | "INCOME"

const KINDS: { value: Kind; label: string }[] = [
  { value: "EXPENSE", label: "Gasto" },
  { value: "INCOME", label: "Ingreso" },
]

export default function NewMovementScreen() {
  const params = useLocalSearchParams<{ kind?: string }>()
  const [kind, setKind] = useState<Kind>(params.kind === "INCOME" ? "INCOME" : "EXPENSE")
  const toast = useToast()

  const save = async (input: ExpenseInput | IncomeInput) => {
    if (kind === "EXPENSE") await expenseService.create(input as ExpenseInput)
    else await incomeService.create(input as IncomeInput)
    toast(kind === "EXPENSE" ? "Gasto guardado" : "Ingreso guardado")
    router.back()
  }

  return (
    <Screen back title="Registrar">
      <Segmented label="Tipo de movimiento" options={KINDS} value={kind} onChange={setKind} />
      {/* key: al cambiar de tipo el formulario empieza de cero, con sus propias validaciones. */}
      <MovementForm
        key={kind}
        kind={kind}
        submitLabel={kind === "EXPENSE" ? "Guardar gasto" : "Guardar ingreso"}
        onSubmit={save}
      />
    </Screen>
  )
}
