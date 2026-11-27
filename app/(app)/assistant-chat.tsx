import { useRef, useState, type ComponentRef } from "react"
import { AccessibilityInfo, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { ArrowUp, ChevronLeft, RotateCcw, Sparkles } from "lucide-react-native"
import { toApiError, userMessage } from "@/api/errors"
import { AnswerBlocks } from "@/components/financeAssistant/AnswerBlocks"
import { Notice } from "@/components/ui/Notice"
import { ErrorState, Skeleton } from "@/components/ui/States"
import { MAX_TEXT_SCALE, Text, Title } from "@/components/ui/Text"
import { useApiQuery } from "@/hooks/useApiQuery"
import { useReducedMotion } from "@/hooks/useReducedMotion"
import { SUGGESTED_QUESTIONS, assistantErrorMessage, turnsToSend } from "@/lib/financeAssistant"
import { TOUCH_SLOP } from "@/lib/touch"
import { financeAssistantService } from "@/services/financeAssistantService"
import { usePalette } from "@/theme/palette"
import type { AssistantBlock, ChatTurn } from "@/types/financeAssistant"

/** content es el texto plano (va al historial); blocks, lo que se dibuja. */
type Message = ChatTurn & { blocks?: AssistantBlock[] }

const MAX_QUESTION = 1000

/**
 * Pregúntale a Cash-Out: un chat con el asistente de finanzas. Responde con
 * tus datos (y graficos), pero no puede cambiar nada. La conversacion vive
 * solo en esta pantalla: el servidor no guarda chats.
 */
export default function AssistantChatScreen() {
  const colors = usePalette()
  const reduced = useReducedMotion()
  const status = useApiQuery(["finance-assistant-status"], (signal) => financeAssistantService.status(signal))
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null)

  const available = status.data?.available ?? false
  const left = remaining ?? status.data?.remaining ?? 0
  const canAsk = available && left > 0 && !pending

  // Cada pregunta reenvia la conversacion: empezar de nuevo cambia de tema y cuesta menos.
  const restart = () => {
    setMessages([])
    setError(null)
    setDraft("")
  }

  const toEnd = () => setTimeout(() => scroll.current?.scrollToEnd({ animated: !reduced }), 50)

  const ask = async (text: string) => {
    const question = text.trim().slice(0, MAX_QUESTION)
    if (!question || !canAsk) return
    const history = messages.map(({ role, content }) => ({ role, content }))
    setMessages((current) => [...current, { role: "user", content: question }])
    setDraft("")
    setError(null)
    setPending(true)
    toEnd()
    try {
      const answer = await financeAssistantService.chat(turnsToSend(history, question))
      setMessages((current) => [...current, { role: "assistant", content: answer.reply, blocks: answer.blocks }])
      setRemaining(answer.remaining)
      // El foco del lector sigue en el campo: se lee la respuesta nueva.
      AccessibilityInfo.announceForAccessibility(answer.reply)
    } catch (err) {
      const apiError = toApiError(err)
      if (apiError.status === 429) setRemaining(0)
      setError(assistantErrorMessage(apiError, userMessage(apiError)))
      // La pregunta vuelve al campo para reintentar sin escribirla de nuevo.
      setMessages((current) => current.slice(0, -1))
      setDraft(question)
    }
    setPending(false)
    toEnd()
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-background">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="w-full max-w-[640px] gap-1 self-center px-4 pt-2">
          <Pressable role="button" aria-label="Volver" onPress={() => router.back()} className="-ml-2 min-h-11 flex-row items-center self-start px-2">
            <ChevronLeft size={22} color={colors.foreground} />
            <Text className="text-[15px]">Volver</Text>
          </Pressable>
          <View className="flex-row items-end justify-between gap-3">
            <Title>Pregúntale a Cash-Out</Title>
            {messages.length > 0 && !pending ? (
              <Pressable role="button" aria-label="Nueva conversación" hitSlop={TOUCH_SLOP} onPress={restart} className="min-h-11 flex-row items-center gap-1.5 px-1">
                <RotateCcw size={16} color={colors.accentInk} />
                <Text tone="accent" weight="medium" className="text-sm">Nueva</Text>
              </Pressable>
            ) : null}
          </View>
          <Text tone="muted" className="text-sm">Responde con tus datos. No puede registrar ni borrar nada.</Text>
        </View>

        <ScrollView ref={scroll} className="flex-1" contentContainerClassName="w-full max-w-[640px] gap-3 self-center px-4 py-4" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          {status.error && !status.data ? (
            <ErrorState error={status.error} onRetry={status.reload} />
          ) : status.data === undefined ? (
            <Skeleton height={120} />
          ) : !available ? (
            <Notice tone="info">El asistente todavía no está activo en este servidor. Mientras tanto puedes ver tus datos en Resumen y Movimientos.</Notice>
          ) : messages.length === 0 ? (
            <View className="gap-3">
              <View className="flex-row items-center gap-2">
                <Sparkles size={18} color={colors.accentInk} />
                <Text weight="medium" className="text-[15px]">Prueba con una de estas</Text>
              </View>
              {SUGGESTED_QUESTIONS.map((question) => (
                <Pressable
                  key={question}
                  role="button"
                  disabled={!canAsk}
                  onPress={() => void ask(question)}
                  className="min-h-12 justify-center rounded-xl border border-border bg-card px-3.5 py-2.5 active:opacity-80"
                >
                  <Text className="text-[15px]">{question}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            messages.map((message, i) => <Bubble key={i} message={message} />)
          )}

          {pending ? (
            <View role="status" className="flex-row items-center gap-2 self-start rounded-2xl bg-muted px-3.5 py-2.5">
              <Sparkles size={14} color={colors.mutedForeground} />
              <Text tone="muted" className="text-sm">Revisando tus datos…</Text>
            </View>
          ) : null}
          {error ? <Notice tone="error">{error}</Notice> : null}
        </ScrollView>

        <View className="w-full max-w-[640px] gap-1.5 self-center border-t border-border px-4 pb-2 pt-2.5">
          <View className="flex-row items-end gap-2">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              editable={available && left > 0}
              placeholder={available ? (left > 0 ? "Escribe tu pregunta…" : "Ya no te quedan preguntas hoy") : "No disponible"}
              placeholderTextColor={colors.mutedForeground}
              accessibilityLabel="Tu pregunta"
              multiline
              maxLength={MAX_QUESTION}
              maxFontSizeMultiplier={MAX_TEXT_SCALE}
              className="max-h-32 min-h-12 flex-1 rounded-xl border border-input bg-card px-3.5 py-3 font-sans text-[15px] text-foreground"
            />
            <Pressable
              role="button"
              aria-label="Enviar pregunta"
              hitSlop={TOUCH_SLOP}
              disabled={!canAsk || !draft.trim()}
              onPress={() => void ask(draft)}
              className="size-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: canAsk && draft.trim() ? colors.primary : colors.muted }}
            >
              <ArrowUp size={20} color={canAsk && draft.trim() ? colors.background : colors.mutedForeground} />
            </Pressable>
          </View>
          {available ? (
            <Text tone="muted" className="text-xs">{left === 1 ? "Te queda 1 pregunta hoy" : `Te quedan ${left} preguntas hoy`}</Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function Bubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <View className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5">
        <Text tone="inverse" className="text-[15px] leading-5">{message.content}</Text>
      </View>
    )
  }
  return <AnswerBlocks blocks={message.blocks ?? [{ kind: "text", markdown: message.content }]} />
}
