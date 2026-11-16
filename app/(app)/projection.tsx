import { useState } from "react"
import { Pressable, View } from "react-native"
import { useLocalSearchParams } from "expo-router"
import { Target } from "lucide-react-native"
import { userMessage, toApiError } from "@/api/errors"
import { LineChart } from "@/components/portfolio/LineChart"
import { SaveScenarioSheet } from "@/components/projections/SaveScenarioSheet"
import { ScenarioStrip } from "@/components/projections/ScenarioStrip"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Field } from "@/components/ui/Field"
import { Screen } from "@/components/ui/Screen"
import { ErrorState, Skeleton } from "@/components/ui/States"
import { Text } from "@/components/ui/Text"
import { useToast } from "@/components/ui/Toast"
import { useApiQuery } from "@/hooks/useApiQuery"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { amountToField } from "@/lib/amount"
import { confirmAction } from "@/lib/confirm"
import { formatSoles } from "@/lib/format"
import { monthlyPlan } from "@/lib/goals"
import { TOUCH_SLOP } from "@/lib/touch"
import {
  DEFAULT_FIELDS,
  RATE_PRESETS,
  formatTerm,
  goalReach,
  parseProjection,
  projectionCurve,
  projectionToFields,
  sameParams,
  type ProjectionFields,
} from "@/lib/projections"
import { goalService } from "@/services/goalService"
import { projectionService } from "@/services/projectionService"
import type { SavingsGoal } from "@/types/goals"
import type { Projection, ProjectionParams } from "@/types/projections"
import { usePalette } from "@/theme/palette"

/** Medio segundo despues de dejar de escribir se pide el resultado al backend. */
const PREVIEW_DELAY_MS = 500

/** Desde una meta: lo ya ahorrado como capital, lo que falta repartido hasta la fecha y la tasa de un deposito a plazo. */
function fieldsForGoal(goal: SavingsGoal): ProjectionFields {
  const { months, perMonth } = monthlyPlan(Math.max(goal.targetAmount - goal.accumulatedAmount, 0), goal.deadline)
  return {
    initialCapital: amountToField(goal.accumulatedAmount),
    monthlyContribution: amountToField(perMonth),
    annualRatePercent: "5",
    periods: String(Math.min(months, 600)),
  }
}

export default function ProjectionScreen() {
  const colors = usePalette()
  const toast = useToast()
  const { goalId } = useLocalSearchParams<{ goalId?: string }>()
  const goals = useApiQuery(["goals"], (signal) => (goalId ? goalService.list(signal) : Promise.resolve([] as SavingsGoal[])))
  const goal = goals.data?.find((item) => String(item.id) === goalId && item.status === "IN_PROGRESS") ?? null

  const [fields, setFields] = useState<ProjectionFields>(DEFAULT_FIELDS)
  // Al llegar la meta, la calculadora se llena una vez con sus datos (durante el render, no en un efecto).
  const [seeded, setSeeded] = useState<number | null>(null)
  if (goal && seeded !== goal.id) {
    setSeeded(goal.id)
    setFields(fieldsForGoal(goal))
  }

  const parsed = parseProjection(fields)
  const params = parsed.params
  const pending = useDebouncedValue(params, PREVIEW_DELAY_MS)
  const preview = useApiQuery(["projection-preview", pending], (signal) => (pending ? projectionService.preview(pending, signal) : Promise.resolve(null)))
  const stale = JSON.stringify(params) !== JSON.stringify(pending) || preview.isRefreshing
  const curve = params ? projectionCurve(params) : null

  const saved = useApiQuery(["projections"], (signal) => projectionService.list(signal))
  const [saving, setSaving] = useState<ProjectionParams | null>(null)

  const set = (key: keyof ProjectionFields) => (value: string) => setFields((current) => ({ ...current, [key]: value }))

  const load = (scenario: Projection) => {
    setFields(projectionToFields(scenario))
    toast(`«${scenario.name}» está en la calculadora`)
  }

  const remove = async (scenario: Projection) => {
    const ok = await confirmAction({
      title: "¿Eliminar este escenario?",
      message: `«${scenario.name}» se borra de tus escenarios guardados.`,
      confirmLabel: "Eliminar",
      destructive: true,
    })
    if (!ok) return
    try {
      await projectionService.remove(scenario.id)
      toast("Escenario eliminado")
      saved.reload()
    } catch (err) {
      toast(userMessage(toApiError(err)))
    }
  }

  const askSave = () => {
    if (!params) return
    if (saved.data?.some((scenario) => sameParams(scenario, params))) return toast("Ese escenario ya está guardado.")
    setSaving(params)
  }

  const reach = goal && params ? goalReach(params, goal.targetAmount, monthlyPlan(1, goal.deadline).months) : null
  const outcome = params ? preview.data : null
  // Desde una meta, la calculadora espera sus datos: asi no muestra valores por defecto que despues saltan.
  const waiting = Boolean(goalId) && !goals.data

  return (
    <Screen back title="Tu proyección" subtitle="Mira cuánto crecería tu ahorro con interés simple y con interés compuesto.">
      {/* Desde una meta: hasta que llega, la calculadora no muestra valores que despues van a saltar. */}
      {waiting && goals.error ? <ErrorState error={goals.error} onRetry={goals.reload} /> : null}
      <View className="gap-2">
        <Text weight="medium" className="text-sm">
          Escenarios guardados
        </Text>
        {saved.error && !saved.data ? (
          <ErrorState error={saved.error} onRetry={saved.reload} />
        ) : saved.data ? (
          <ScenarioStrip scenarios={saved.data} onLoad={load} onDelete={(scenario) => void remove(scenario)} />
        ) : (
          <Skeleton height={84} />
        )}
      </View>

      {waiting ? (
        goals.error ? null : (
          <Skeleton height={300} />
        )
      ) : (
        <>
          <Card className="gap-3.5">
            <Field
              label="Capital inicial (S/)"
              value={fields.initialCapital}
              onChangeText={set("initialCapital")}
              keyboardType="decimal-pad"
              error={parsed.errors?.initialCapital}
            />
            <Field
              label="Aporte mensual (S/)"
              value={fields.monthlyContribution}
              onChangeText={set("monthlyContribution")}
              keyboardType="decimal-pad"
              error={parsed.errors?.monthlyContribution}
            />
            <Field
              label="TEA (%)"
              value={fields.annualRatePercent}
              onChangeText={set("annualRatePercent")}
              keyboardType="decimal-pad"
              error={parsed.errors?.annualRatePercent}
            />
            <View role="radiogroup" aria-label="Tasas de referencia" className="-mt-1 flex-row flex-wrap gap-2">
              {RATE_PRESETS.map((preset) => {
                const on = fields.annualRatePercent.trim() === String(preset.percent)
                return (
                  <Pressable
                    key={preset.label}
                    hitSlop={TOUCH_SLOP}
                    role="radio"
                    aria-checked={on}
                    onPress={() => set("annualRatePercent")(String(preset.percent))}
                    className={`min-h-9 justify-center rounded-full border px-3 ${on ? "border-accent-ink bg-accent" : "border-border"}`}
                  >
                    <Text weight={on ? "semibold" : "regular"} className="text-[13px]">
                      {preset.label} · {preset.percent} %
                    </Text>
                  </Pressable>
                )
              })}
            </View>
            <Text tone="muted" className="-mt-1.5 text-xs">
              Tasas de referencia para comparar; no son ofertas reales.
            </Text>
            <Field label="Plazo (meses)" value={fields.periods} onChangeText={set("periods")} keyboardType="number-pad" error={parsed.errors?.periods} />
            {params ? (
              <Text tone="muted" className="-mt-1.5 text-xs">
                {formatTerm(params.periods)}
              </Text>
            ) : null}
          </Card>

          <Card className={`gap-3 ${stale ? "opacity-70" : ""}`}>
            <Text weight="medium" className="text-sm">
              Así crece tu ahorro
            </Text>
            {!params ? (
              <Text tone="muted" className="text-sm">
                Corrige los datos para ver el resultado.
              </Text>
            ) : preview.error && !outcome ? (
              <ErrorState error={preview.error} onRetry={preview.reload} />
            ) : !outcome ? (
              <Skeleton height={120} />
            ) : (
              <View className="gap-2.5">
                <Outcome label="Lo que aportas" value={outcome.totalContributed} />
                <Outcome label="Con interés simple" value={outcome.simpleFinalAmount} />
                <Outcome label="Con interés compuesto" value={outcome.compoundFinalAmount} strong />
                <Text tone="accent" weight="medium" className="text-[13px]">
                  {outcome.difference > 0
                    ? `El interés compuesto te da ${formatSoles(outcome.difference)} más que el simple.`
                    : "Con una tasa de 0 % tu ahorro no crece: solo suma lo que aportas."}
                </Text>
              </View>
            )}
            {curve ? (
              <LineChart
                height={150}
                lines={[
                  { values: curve.compound, color: colors.accentInk, area: true },
                  { values: curve.simple, color: colors.primary },
                  { values: curve.contributed, color: colors.mutedForeground, dashed: true },
                ]}
                // La escala parte del valor mas bajo de las curvas (el capital inicial), no de cero: ese es el piso que se rotula.
                extremes={{ top: formatSoles(curve.compound[curve.compound.length - 1]), bottom: formatSoles(curve.contributed[0]) }}
                accessibilityLabel={`Gráfico de crecimiento en ${formatTerm(curve.compound.length - 1)}: compuesto, simple y lo aportado`}
              />
            ) : null}
            {curve ? (
              <View className="flex-row flex-wrap gap-x-4 gap-y-1">
                <Legend color={colors.accentInk} label="Compuesto" />
                <Legend color={colors.primary} label="Simple" />
                <Legend color={colors.mutedForeground} label="Aportado" />
              </View>
            ) : null}
          </Card>

          {goal && reach && params ? (
            <Card className="gap-2.5">
              <View className="flex-row items-center gap-2">
                <Target size={18} color={colors.accentInk} />
                <Text weight="semibold" className="flex-1 text-sm">
                  Tu meta {goal.name} · {formatSoles(goal.targetAmount)}
                </Text>
              </View>
              <Text className="text-sm leading-5">
                {reach.reachMonth === null
                  ? "Con estos datos no llegas a la meta en 50 años."
                  : reach.reachMonth === 0
                    ? "Ya tienes lo necesario para cumplirla."
                    : `Con estos datos llegas en ${formatTerm(reach.reachMonth)}.`}{" "}
                {reach.needed > 0 && reach.needed !== params.monthlyContribution ? `Para llegar a tiempo necesitas ${formatSoles(reach.needed)} al mes.` : ""}
              </Text>
              {reach.needed > 0 && reach.needed !== params.monthlyContribution ? (
                <Button
                  label={`Usar ${formatSoles(reach.needed)} al mes`}
                  variant="outline"
                  onPress={() => set("monthlyContribution")(amountToField(reach.needed))}
                />
              ) : null}
            </Card>
          ) : null}

          <Button label="Guardar escenario" disabled={!params} onPress={askSave} />
        </>
      )}

      <SaveScenarioSheet
        params={saving}
        goal={goal ? { id: goal.id, name: goal.name } : null}
        onClose={() => setSaving(null)}
        onSaved={(name) => {
          setSaving(null)
          toast(`Guardaste «${name}»`)
          saved.reload()
        }}
      />
    </Screen>
  )
}

function Outcome({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <View className="flex-row items-baseline justify-between gap-3">
      <Text tone={strong ? "default" : "muted"} className="text-sm">
        {label}
      </Text>
      <Text weight={strong ? "semibold" : "medium"} className={strong ? "text-lg" : "text-sm"} style={{ fontVariant: ["tabular-nums"] }}>
        {formatSoles(value)}
      </Text>
    </View>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className="h-0.5 w-4 rounded-full" style={{ backgroundColor: color }} />
      <Text tone="muted" className="text-xs">
        {label}
      </Text>
    </View>
  )
}
