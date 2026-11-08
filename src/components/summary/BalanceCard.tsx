import { View } from "react-native"
import { Card } from "@/components/ui/Card"
import { Text } from "@/components/ui/Text"
import { formatSoles } from "@/lib/format"
import type { Savings } from "@/types/finance"

interface BalanceCardProps {
  savings: Savings
  /** Ingresos y gastos del mes en curso; undefined mientras cargan. */
  month?: { earned: number; spent: number }
  goalsInProgress: number
}

/** Lo primero que responde el Resumen: cuanto se puede gastar, sin contar lo apartado en metas. */
export function BalanceCard({ savings, month, goalsInProgress }: BalanceCardProps) {
  const committed = savings.committedAmount > 0
    ? `Sin contar ${formatSoles(savings.committedAmount)} apartados en ${goalsInProgress === 1 ? "1 meta" : `${goalsInProgress} metas`}`
    : "Nada apartado en metas por ahora"

  return (
    <Card
      className="gap-4 p-5"
      accessible
      accessibilityLabel={`Disponible para gastar: ${formatSoles(savings.availableBalance)}. ${committed}.`}
    >
      <View className="gap-1">
        <Text tone="muted" weight="medium" className="text-[13px]">Disponible para gastar</Text>
        <Text weight="semibold" className="text-4xl" style={{ fontVariant: ["tabular-nums"] }}>
          {formatSoles(savings.availableBalance)}
        </Text>
        <Text tone="muted" className="text-[13px]">{committed}</Text>
      </View>
      {month ? (
        <View className="flex-row border-t border-border pt-4">
          <View className="flex-1 gap-0.5">
            <Text tone="muted" className="text-xs">Ingresos del mes</Text>
            <Text weight="semibold" tone="income" className="text-[17px]">+{formatSoles(month.earned)}</Text>
          </View>
          <View className="flex-1 gap-0.5 border-l border-border pl-3">
            <Text tone="muted" className="text-xs">Gastos del mes</Text>
            <Text weight="semibold" tone="expense" className="text-[17px]">−{formatSoles(month.spent)}</Text>
          </View>
        </View>
      ) : null}
    </Card>
  )
}
