import { useState } from "react"
import { AccessibilityInfo, Pressable, View } from "react-native"
import { Minus, Plus } from "lucide-react-native"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Text, Title } from "@/components/ui/Text"
import { haptics } from "@/lib/haptics"
import { adjustWeight, diversification, totalWeight, WEIGHT_STEP } from "@/lib/portfolioGame"
import type { PortfolioGameView, Weights } from "@/types/portfolioGame"
import { usePalette } from "@/theme/palette"
import { MixBar, useSectorColor } from "./PortfolioBoards"

/** Los botones −10 y +10: area extra tambien a los lados, el porcentaje del medio no es un boton. */
const STEPPER_SLOP = { top: 8, bottom: 8, left: 6, right: 6 }
const HINT_TONE = { risk: "loss", warn: "accent", ok: "gain" } as const

interface AllocationEditorProps {
  view: PortfolioGameView
  busy: boolean
  onReady: (weights: Weights) => void
  onEdit: () => void
}

/** Repartir el 100 % entre los 8 sectores, de 10 en 10, y dejarlo listo. */
export function AllocationEditor({ view, busy, onReady, onEdit }: AllocationEditorProps) {
  const colors = usePalette()
  const colorOf = useSectorColor()
  const ready = view.me!.ready
  const [weights, setWeights] = useState<Weights>(() => view.me!.weights ?? {})
  const total = totalWeight(weights)
  const hint = total === 100 ? diversification(weights) : null

  const change = (key: string, name: string, delta: number) => {
    haptics.selection()
    const next = adjustWeight(weights, key, delta)
    setWeights(next)
    // El porcentaje cambia en silencio en pantalla: el lector lo dice en voz alta.
    AccessibilityInfo.announceForAccessibility(`${name}, ${next[key] ?? 0} %`)
  }

  return (
    <View className="gap-4">
      <View className="gap-1">
        <Title size="md">Reparte el 100 %</Title>
        <Text tone="muted" className="text-sm leading-5">
          De {WEIGHT_STEP} en {WEIGHT_STEP}. No sabes qué semestres vienen: piensa qué aguanta una crisis y qué sube con optimismo.
        </Text>
      </View>

      <Card className="px-0 py-1">
        {view.sectors.map((sector, i) => {
          const weight = weights[sector.key] ?? 0
          return (
            <View key={sector.key} className={`min-h-14 flex-row items-center gap-3 px-4 py-2 ${i > 0 ? "border-t border-border" : ""}`}>
              <View className="size-2.5 rounded-full" style={{ backgroundColor: colorOf(sector.key) }} />
              <View className="flex-1">
                <Text weight="medium" className="text-sm">{sector.name}</Text>
                <Text tone="muted" className="text-xs">{sector.kind} · {sector.symbol}</Text>
                {/* Quien no sabe que es XLV o AGG no reparte a ciegas. */}
                <Text tone="muted" numberOfLines={2} className="text-xs leading-4">{sector.description}</Text>
              </View>
              <Pressable
                hitSlop={STEPPER_SLOP}
                role="button"
                aria-label={`Quitar ${WEIGHT_STEP} % de ${sector.name}`}
                disabled={ready || weight === 0}
                onPress={() => change(sector.key, sector.name, -WEIGHT_STEP)}
                className={`size-9 items-center justify-center rounded-full border border-border ${ready || weight === 0 ? "opacity-40" : ""}`}
              >
                <Minus size={16} color={colors.foreground} />
              </Pressable>
              <Text weight="semibold" className="w-12 text-center text-sm" style={{ fontVariant: ["tabular-nums"] }}>{weight} %</Text>
              <Pressable
                hitSlop={STEPPER_SLOP}
                role="button"
                aria-label={`Agregar ${WEIGHT_STEP} % a ${sector.name}`}
                disabled={ready || total >= 100}
                onPress={() => change(sector.key, sector.name, WEIGHT_STEP)}
                className={`size-9 items-center justify-center rounded-full border border-border ${ready || total >= 100 ? "opacity-40" : ""}`}
              >
                <Plus size={16} color={colors.foreground} />
              </Pressable>
            </View>
          )
        })}
      </Card>

      <Card className="gap-2">
        <View className="flex-row justify-between">
          <Text className="text-sm">Por asignar</Text>
          <Text weight="semibold" tone={total === 100 ? "gain" : "accent"} className="text-sm" style={{ fontVariant: ["tabular-nums"] }}>{100 - total} %</Text>
        </View>
        <MixBar weights={weights} sectors={view.sectors} height={12} />
        {hint ? <Text tone={HINT_TONE[hint.tone]} className="text-sm">{hint.text}</Text> : null}
      </Card>

      {ready ? (
        <View className="gap-2.5">
          <Text tone="gain" weight="medium" className="text-sm">Listo. Esperando a que el anfitrión empiece…</Text>
          <Button label="Cambiar mi portafolio" variant="outline" loading={busy} onPress={onEdit} />
        </View>
      ) : (
        <Button
          label={total !== 100 ? `Asigna el 100 % (faltan ${100 - total} %)` : "Estoy listo"}
          disabled={total !== 100}
          loading={busy}
          onPress={() => onReady(weights)}
        />
      )}
    </View>
  )
}
