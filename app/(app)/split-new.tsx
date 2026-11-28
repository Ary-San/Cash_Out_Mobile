import { useState } from "react"
import { Pressable, Switch, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { toApiError, userMessage } from "@/api/errors"
import { CategoryPicker } from "@/components/movements/CategoryPicker"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Field } from "@/components/ui/Field"
import { Notice } from "@/components/ui/Notice"
import { Screen } from "@/components/ui/Screen"
import { Segmented } from "@/components/ui/Segmented"
import { Text } from "@/components/ui/Text"
import { useToast } from "@/components/ui/Toast"
import { todayIso } from "@/lib/dates"
import { formatSoles } from "@/lib/format"
import { previewMyShare } from "@/lib/splits"
import { splitService } from "@/services/splitService"
import { usePalette } from "@/theme/palette"
import type { ExpenseCategory } from "@/types/movements"
import type { SplitMode } from "@/types/splits"

const MODES: { value: SplitMode; label: string }[] = [
  { value: "EQUAL", label: "Iguales" },
  { value: "AMOUNT", label: "Montos" },
  { value: "PERCENT", label: "%" },
]
const WHO: { value: "me" | "other"; label: string }[] = [
  { value: "me", label: "Pagué yo" },
  { value: "other", label: "Pagó otro" },
]

interface Person {
  key: number
  name: string
  phone: string
  value: string
}

const toNumber = (text: string) => Number(text.trim().replace(",", "."))

/**
 * Dividir una cuenta. Con expenseId (desde un gasto o una frase "entre 4") el total,
 * la categoria y la fecha salen del gasto ya anotado; names trae los nombres sugeridos.
 */
export default function NewSplitScreen() {
  const params = useLocalSearchParams<{ expenseId?: string; amount?: string; description?: string; category?: string; names?: string }>()
  const expenseId = params.expenseId ? Number(params.expenseId) : undefined
  const toast = useToast()
  const colors = usePalette()
  const [title, setTitle] = useState(params.description ?? "")
  const [total, setTotal] = useState(params.amount ?? "")
  const [category, setCategory] = useState<ExpenseCategory>((params.category as ExpenseCategory) || "FOOD")
  const [who, setWho] = useState<"me" | "other">("me")
  const [mode, setMode] = useState<SplitMode>("EQUAL")
  const [includeMe, setIncludeMe] = useState(true)
  const [payer, setPayer] = useState(0)
  const [people, setPeople] = useState<Person[]>(() => {
    const names = (params.names ?? "").split("|").filter(Boolean)
    return (names.length > 0 ? names : [""]).map((name, key) => ({ key, name, phone: "", value: "" }))
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const paidByMe = expenseId !== undefined || who === "me"
  const totalNumber = toNumber(total)
  const myShare = previewMyShare(totalNumber, mode, paidByMe ? includeMe : true, people.map((p) => toNumber(p.value)))
  const change = (key: number, patch: Partial<Person>) => setPeople((list) => list.map((p) => (p.key === key ? { ...p, ...patch } : p)))

  const save = async () => {
    setError(null)
    if (people.some((p) => !p.name.trim())) {
      setError("Cada persona necesita un nombre.")
      return
    }
    setSaving(true)
    try {
      const bill = await splitService.create({
        ...(expenseId !== undefined
          ? { expenseId, title: title.trim() || undefined }
          : { title: title.trim(), total: totalNumber, category, date: todayIso() }),
        paidByMe,
        payerIndex: paidByMe ? undefined : payer,
        mode,
        includeMe: paidByMe ? includeMe : true,
        people: people.map((p) => ({
          name: p.name.trim(),
          phone: p.phone.trim() || undefined,
          amount: mode === "AMOUNT" ? toNumber(p.value) : undefined,
          percent: mode === "PERCENT" ? toNumber(p.value) : undefined,
        })),
      })
      toast(bill.paidByMe ? `Cuenta dividida: te deben ${formatSoles(bill.pending)}` : `Cuenta guardada: debes ${formatSoles(bill.pending)}`)
      router.replace("/split-bills")
    } catch (err) {
      setError(userMessage(toApiError(err)))
      setSaving(false)
    }
  }

  return (
    <Screen title={expenseId !== undefined ? "Dividir gasto" : "Nueva cuenta"} back>
      <Card className="gap-4 p-5">
        <Field label="Nombre de la cuenta" placeholder="Ej.: Cena del sábado" maxLength={80} value={title} onChangeText={setTitle} />
        {expenseId === undefined ? (
          <>
            <Field label="Total (S/)" keyboardType="decimal-pad" placeholder="0.00" value={total} onChangeText={setTotal} />
            <CategoryPicker value={category} onChange={setCategory} />
            <Segmented label="Quién pagó" options={WHO} value={who} onChange={setWho} />
          </>
        ) : (
          <Text tone="muted" className="text-sm leading-5">
            El gasto de {formatSoles(totalNumber)} queda como está; cada «me pagó» entra como un reembolso.
          </Text>
        )}
        <Segmented label="Cómo se divide" options={MODES} value={mode} onChange={setMode} />
        {paidByMe ? (
          <View className="min-h-11 flex-row items-center justify-between">
            <Text className="text-sm">Yo también tengo una parte</Text>
            <Switch value={includeMe} onValueChange={setIncludeMe} accessibilityLabel="Yo también tengo una parte" trackColor={{ true: colors.primary, false: colors.border }} />
          </View>
        ) : null}
      </Card>

      <Card className="gap-4 p-5">
        <Text weight="semibold" className="text-[15px]">Con quiénes</Text>
        {people.map((person, index) => (
          <View key={person.key} className={`gap-2 ${index > 0 ? "border-t border-border pt-4" : ""}`}>
            <Field label={`Persona ${index + 1}`} placeholder="Nombre" maxLength={60} value={person.name} onChangeText={(name) => change(person.key, { name })} />
            <Field
              label={`WhatsApp de ${person.name.trim() || `la persona ${index + 1}`} (opcional)`}
              placeholder="987654321"
              keyboardType="phone-pad"
              value={person.phone}
              onChangeText={(phone) => change(person.key, { phone })}
            />
            {mode !== "EQUAL" ? (
              <Field
                label={mode === "AMOUNT" ? `Le toca (S/)` : `Porcentaje (%)`}
                keyboardType="decimal-pad"
                value={person.value}
                onChangeText={(value) => change(person.key, { value })}
              />
            ) : null}
            {!paidByMe ? (
              <Pressable
                role="radio"
                aria-checked={payer === index}
                onPress={() => setPayer(index)}
                className="min-h-11 flex-row items-center gap-2"
              >
                <View className={`size-5 items-center justify-center rounded-full border-2 ${payer === index ? "border-primary" : "border-border"}`}>
                  {payer === index ? <View className="size-2.5 rounded-full bg-primary" /> : null}
                </View>
                <Text className="text-sm">Pagó {person.name.trim() || "esta persona"}</Text>
              </Pressable>
            ) : null}
            {people.length > 1 ? (
              <Pressable
                role="button"
                aria-label={`Quitar a ${person.name.trim() || `la persona ${index + 1}`}`}
                onPress={() => {
                  setPeople((list) => list.filter((p) => p.key !== person.key))
                  setPayer(0)
                }}
                className="min-h-11 justify-center self-start"
              >
                <Text tone="destructive" className="text-[13px]">Quitar</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        {people.length < 20 ? (
          <Button
            label="Agregar persona"
            variant="outline"
            onPress={() => setPeople((list) => [...list, { key: Math.max(...list.map((p) => p.key)) + 1, name: "", phone: "", value: "" }])}
          />
        ) : null}
      </Card>

      <Text role="status" tone="muted" className="text-sm leading-5">
        {myShare === null
          ? "Completa el total y las partes para ver cuánto te toca."
          : myShare < 0
            ? "Las partes se pasan del total."
            : `Tu parte: ${formatSoles(myShare)}. ${paidByMe ? `Te deben ${formatSoles(Math.max(0, totalNumber - myShare))}.` : `Le debes ${formatSoles(myShare)} a quien pagó.`}`}
      </Text>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button label="Guardar cuenta" loading={saving} onPress={() => void save()} />
    </Screen>
  )
}
