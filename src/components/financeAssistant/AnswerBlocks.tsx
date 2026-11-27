import { ScrollView, View } from "react-native"
import { CircleCheck, Info, Lightbulb, TriangleAlert, type LucideIcon } from "lucide-react-native"
import { Text } from "@/components/ui/Text"
import { blockSummary, cell, deltaTone, formatDelta, formatValue, inlineParts, replyBlocks, shortDate } from "@/lib/financeAssistant"
import { usePalette } from "@/theme/palette"
import type { AssistantBlock } from "@/types/financeAssistant"
import { PlotView } from "./PlotView"

const tabular = { fontVariant: ["tabular-nums" as const] }

/** La respuesta del asistente: texto y, solo si hacen falta, cifras, tablas, rankings, graficos... en orden. */
export function AnswerBlocks({ blocks }: { blocks: AssistantBlock[] }) {
  return (
    <View className="gap-2.5 self-stretch">
      {blocks.map((block, i) => (
        <Block key={block.kind === "text" ? `t${i}` : block.id} block={block} />
      ))}
    </View>
  )
}

function Block({ block }: { block: AssistantBlock }) {
  switch (block.kind) {
    case "text":
      return <Prose markdown={block.markdown} />
    case "plot":
      return <PlotView spec={block.spec} />
    case "metrics":
      return <Metrics block={block} />
    case "table":
      return <Table block={block} />
    case "ranking":
      return <Ranking block={block} />
    case "comparison":
      return <Comparison block={block} />
    case "timeline":
      return <Timeline block={block} />
    case "callout":
      return <Callout block={block} />
    case "steps":
      return <Steps block={block} />
  }
}

/** El texto del asistente: parrafos, vinetas y negritas. */
function Prose({ markdown }: { markdown: string }) {
  return (
    <View className="gap-1.5 rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5">
      {replyBlocks(markdown).map((part, i) => (
        <View key={i} className={part.kind === "bullet" ? "flex-row gap-2 pl-1" : undefined}>
          {part.kind === "bullet" ? <Text className="text-[15px] leading-5">•</Text> : null}
          <Text className="flex-1 text-[15px] leading-5">
            {inlineParts(part.text).map((piece, j) => (
              <Text key={j} weight={piece.bold ? "semibold" : "regular"} className="text-[15px] leading-5">{piece.text}</Text>
            ))}
          </Text>
        </View>
      ))}
    </View>
  )
}

/** Un marco comun: todos los bloques visuales se leen enteros por el lector de pantalla. */
function Frame({ block, children, className = "" }: { block: AssistantBlock; children: React.ReactNode; className?: string }) {
  return (
    <View accessible accessibilityLabel={blockSummary(block)} className={`rounded-2xl border border-border bg-card p-3.5 ${className}`}>
      {children}
    </View>
  )
}

function Metrics({ block }: { block: Extract<AssistantBlock, { kind: "metrics" }> }) {
  return (
    <Frame block={block} className="flex-row flex-wrap gap-y-3">
      {block.items.map((item) => {
        const tone = deltaTone(item.delta, item.higherIsGood)
        return (
          <View key={item.label} className={block.items.length === 1 ? "w-full" : "w-1/2 pr-2"}>
            <Text tone="muted" className="text-xs">{item.label}</Text>
            <Text weight="semibold" className="text-2xl" style={tabular}>{formatValue(item.value, item.unit)}</Text>
            {item.delta !== undefined ? (
              <Text tone={tone === "neutral" ? "muted" : tone} className="text-xs" style={tabular}>
                {formatDelta(item.delta)}{item.deltaLabel ? ` ${item.deltaLabel}` : ""}
              </Text>
            ) : null}
          </View>
        )
      })}
    </Frame>
  )
}

function Table({ block }: { block: Extract<AssistantBlock, { kind: "table" }> }) {
  const colors = usePalette()
  return (
    <Frame block={block} className="gap-2 px-0">
      {/* Con pocas columnas entra en el ancho; con mas, se desliza de lado. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="min-w-full px-3.5">
        <View className="min-w-full">
          <View className="flex-row border-b border-border pb-1.5">
            {block.columns.map((column) => (
              <Text key={column.key} weight="medium" tone="muted" className={`min-w-24 flex-1 px-1 text-xs ${column.unit ? "text-right" : ""}`}>{column.label}</Text>
            ))}
          </View>
          {block.rows.map((row, i) => (
            <View key={i} className="flex-row py-1.5" style={i < block.rows.length - 1 ? { borderBottomWidth: 1, borderColor: colors.border } : undefined}>
              {block.columns.map((column) => (
                <Text key={column.key} className={`min-w-24 flex-1 px-1 text-[13px] ${column.unit ? "text-right" : ""}`} style={column.unit ? tabular : undefined}>
                  {cell(row[column.key], column.unit)}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      {block.caption ? <Text tone="muted" className="px-3.5 text-xs">{block.caption}</Text> : null}
    </Frame>
  )
}

function Ranking({ block }: { block: Extract<AssistantBlock, { kind: "ranking" }> }) {
  const colors = usePalette()
  const max = Math.max(...block.items.map((item) => Math.abs(item.value)), 0)
  return (
    <Frame block={block} className="gap-2.5">
      {block.items.map((item, i) => (
        <View key={`${item.label}-${i}`} className="gap-1">
          <View className="flex-row items-baseline gap-2">
            <Text tone="muted" className="w-5 text-xs" style={tabular}>{i + 1}</Text>
            <Text numberOfLines={1} className="flex-1 text-[13px]">{item.label}</Text>
            <Text weight="medium" className="text-[13px]" style={tabular}>{formatValue(item.value, block.unit)}</Text>
          </View>
          <View className="ml-7 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: colors.muted }}>
            <View className="h-full rounded-full" style={{ width: `${max > 0 ? (Math.abs(item.value) / max) * 100 : 0}%`, backgroundColor: i === 0 ? colors.accentInk : colors.mutedForeground }} />
          </View>
          {item.detail ? <Text tone="muted" className="ml-7 text-xs">{item.detail}</Text> : null}
        </View>
      ))}
    </Frame>
  )
}

function Comparison({ block }: { block: Extract<AssistantBlock, { kind: "comparison" }> }) {
  return (
    <Frame block={block} className="gap-3">
      <View className="flex-row gap-3">
        {[block.left, block.right].map((side, i) => (
          <View key={i} className="flex-1 gap-1.5 rounded-xl bg-muted p-2.5">
            <Text weight="semibold" numberOfLines={1} className="text-sm">{side.title}</Text>
            {side.items.map((item) => (
              <View key={item.label}>
                <Text tone="muted" className="text-xs">{item.label}</Text>
                <Text weight="medium" className="text-[15px]" style={tabular}>{formatValue(item.value, item.unit)}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
      {block.verdict ? <Text className="text-[13px] leading-5">{block.verdict}</Text> : null}
    </Frame>
  )
}

function Timeline({ block }: { block: Extract<AssistantBlock, { kind: "timeline" }> }) {
  const colors = usePalette()
  const dot = { gain: colors.gain, loss: colors.loss, neutral: colors.accentInk }
  return (
    <Frame block={block}>
      {block.items.map((item, i) => (
        <View key={`${item.date}-${i}`} className="flex-row gap-3">
          <View className="items-center">
            <View className="mt-1 size-2.5 rounded-full" style={{ backgroundColor: dot[item.tone] }} />
            {i < block.items.length - 1 ? <View className="w-px flex-1" style={{ backgroundColor: colors.border }} /> : null}
          </View>
          <View className="flex-1 pb-3">
            <Text tone="muted" className="text-xs">{shortDate(item.date)}</Text>
            <Text weight="medium" className="text-[13px]">{item.title}</Text>
            {item.detail ? <Text tone="muted" className="text-xs leading-4">{item.detail}</Text> : null}
          </View>
        </View>
      ))}
    </Frame>
  )
}

const CALLOUT: Record<"tip" | "warning" | "info" | "success", { icon: LucideIcon; label: string }> = {
  tip: { icon: Lightbulb, label: "Consejo" },
  warning: { icon: TriangleAlert, label: "Ojo" },
  info: { icon: Info, label: "Dato" },
  success: { icon: CircleCheck, label: "Bien" },
}

function Callout({ block }: { block: Extract<AssistantBlock, { kind: "callout" }> }) {
  const colors = usePalette()
  const ink = { tip: colors.accentInk, warning: colors.warning, info: colors.mutedForeground, success: colors.gain }[block.tone]
  const { icon: Icon, label } = CALLOUT[block.tone]
  return (
    <View accessible accessibilityLabel={`${label}: ${blockSummary(block)}`} className="flex-row gap-2.5 rounded-2xl border p-3.5" style={{ borderColor: ink, backgroundColor: `${ink}14` }}>
      <Icon size={18} color={ink} />
      <Text className="flex-1 text-[14px] leading-5">
        {inlineParts(block.markdown).map((piece, j) => (
          <Text key={j} weight={piece.bold ? "semibold" : "regular"} className="text-[14px] leading-5">{piece.text}</Text>
        ))}
      </Text>
    </View>
  )
}

function Steps({ block }: { block: Extract<AssistantBlock, { kind: "steps" }> }) {
  return (
    <Frame block={block} className="gap-3">
      {block.items.map((item, i) => (
        <View key={i} className="flex-row items-start gap-3">
          <View className="size-6 items-center justify-center rounded-full bg-accent">
            <Text weight="semibold" tone="accent" className="text-xs">{i + 1}</Text>
          </View>
          <View className="flex-1 gap-0.5">
            <Text weight="medium" className="text-[14px] leading-5">{item.title}</Text>
            {item.detail ? <Text tone="muted" className="text-[13px] leading-5">{item.detail}</Text> : null}
          </View>
        </View>
      ))}
    </Frame>
  )
}
