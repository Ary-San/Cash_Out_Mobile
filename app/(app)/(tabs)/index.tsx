import { View } from "react-native"
import { PiggyBank } from "lucide-react-native"
import { Card } from "@/components/ui/Card"
import { Screen } from "@/components/ui/Screen"
import { EmptyState, Skeleton } from "@/components/ui/States"
import { Text } from "@/components/ui/Text"
import { useAuth } from "@/hooks/useAuth"
import { firstName, longToday } from "@/lib/format"

export default function SummaryScreen() {
  const { user } = useAuth()

  return (
    <Screen title={`Hola, ${firstName(user?.name)}`} subtitle={longToday()}>
      <Card className="gap-3">
        <Text tone="muted" className="text-sm">Saldo del mes</Text>
        <Skeleton width="55%" height={34} />
        <View className="flex-row gap-3">
          <View className="flex-1 gap-1.5">
            <Text tone="income" className="text-xs">Ingresos</Text>
            <Skeleton height={14} />
          </View>
          <View className="flex-1 gap-1.5">
            <Text tone="expense" className="text-xs">Gastos</Text>
            <Skeleton height={14} />
          </View>
        </View>
      </Card>
      <EmptyState
        icon={PiggyBank}
        title="Tu resumen llega pronto"
        message="Aquí vas a ver tu saldo, en qué gastas más y cómo van tus metas."
      />
    </Screen>
  )
}
