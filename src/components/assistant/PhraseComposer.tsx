import { useState } from "react"
import { View } from "react-native"
import { toApiError, userMessage } from "@/api/errors"
import { DraftList } from "@/components/assistant/DraftCard"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Field } from "@/components/ui/Field"
import { Notice } from "@/components/ui/Notice"
import { Text } from "@/components/ui/Text"
import { assistantService } from "@/services/assistantService"
import type { Draft } from "@/types/assistant"

/** "Registra con una frase": se escribe como se habla y salen tarjetas para revisar. */
export function PhraseComposer({ onSaved }: { onSaved: () => void }) {
  const [text, setText] = useState("")
  const [reading, setReading] = useState(false)
  const [result, setResult] = useState<{ drafts: Draft[]; id: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const read = async () => {
    const phrase = text.trim()
    if (!phrase || reading) return
    setReading(true)
    setError(null)
    try {
      setResult({ drafts: await assistantService.drafts({ text: phrase }), id: Date.now() })
      setText("")
    } catch (err) {
      setError(userMessage(toApiError(err)))
    } finally {
      setReading(false)
    }
  }

  return (
    <View className="gap-3">
      <Card className="gap-3">
        <Field
          label="Registra con una frase"
          placeholder="ayer taxi 12 y chifa 35 con yape"
          autoCapitalize="none"
          maxLength={500}
          returnKeyType="send"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => void read()}
        />
        <Button label="Leer frase" loading={reading} disabled={!text.trim()} onPress={() => void read()} />
        {error ? <Notice tone="error">{error}</Notice> : null}
      </Card>
      {result && result.drafts.length === 0 ? (
        <Text role="status" tone="muted" className="text-sm">
          No encontramos ningún gasto ni ingreso en esa frase. Prueba con algo como &quot;almuerzo 15&quot;.
        </Text>
      ) : null}
      {result && result.drafts.length > 0 ? <DraftList key={result.id} drafts={result.drafts} onSaved={onSaved} /> : null}
    </View>
  )
}
