import { ReceiptText } from "lucide-react-native"
import { Screen } from "@/components/ui/Screen"
import { EmptyState } from "@/components/ui/States"

export default function MovementsScreen() {
  return (
    <Screen title="Movimientos" subtitle="Tus gastos e ingresos">
      <EmptyState
        icon={ReceiptText}
        title="Todavía no hay movimientos"
        message="Vas a poder registrarlos con una frase o escaneando el QR de tu boleta."
      />
    </Screen>
  )
}
