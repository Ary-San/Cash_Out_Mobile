import { Pressable, ScrollView, View } from "react-native"
import { X } from "lucide-react-native"
import { Text } from "@/components/ui/Text"
import { formatSoles } from "@/lib/format"
import { paramsSummary } from "@/lib/projections"
import type { Projection } from "@/types/projections"
import { usePalette } from "@/theme/palette"

interface ScenarioStripProps {
  scenarios: Projection[]
  onLoad: (scenario: Projection) => void
  onDelete: (scenario: Projection) => void
}

/** Los escenarios guardados en una fila: tocar uno lo carga en la calculadora. */
export function ScenarioStrip({ scenarios, onLoad, onDelete }: ScenarioStripProps) {
  const colors = usePalette()
  if (scenarios.length === 0) {
    return <Text tone="muted" className="text-[13px]">Todavía no guardas escenarios. Guarda uno para compararlo después.</Text>
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2.5 pr-5">
      {scenarios.map((scenario) => (
        <View key={scenario.id} className="w-60 flex-row rounded-2xl border border-border bg-card">
          <Pressable
            role="button"
            aria-label={`Cargar ${scenario.name}: ${paramsSummary(scenario)}. Llegas a ${formatSoles(scenario.compoundFinalAmount)}`}
            onPress={() => onLoad(scenario)}
            className="min-h-11 flex-1 gap-1 py-3 pl-3.5 active:opacity-70"
          >
            <Text weight="semibold" numberOfLines={1} className="text-sm">{scenario.name}</Text>
            <Text tone="muted" numberOfLines={2} className="text-xs leading-4">{paramsSummary(scenario)}</Text>
            <Text tone="accent" weight="medium" className="text-xs">Llegas a {formatSoles(scenario.compoundFinalAmount)}</Text>
          </Pressable>
          <Pressable
            role="button"
            aria-label={`Eliminar ${scenario.name}`}
            onPress={() => onDelete(scenario)}
            className="size-11 items-center justify-center"
          >
            <X size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>
      ))}
    </ScrollView>
  )
}
