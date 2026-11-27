import { useState } from "react"
import { Linking, Share, View } from "react-native"
import * as Clipboard from "expo-clipboard"
import { ShieldCheck } from "lucide-react-native"
import { toApiError, userMessage } from "@/api/errors"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Field } from "@/components/ui/Field"
import { Notice } from "@/components/ui/Notice"
import { Screen } from "@/components/ui/Screen"
import { ErrorState, Skeleton } from "@/components/ui/States"
import { Text } from "@/components/ui/Text"
import { useToast } from "@/components/ui/Toast"
import { useApiQuery } from "@/hooks/useApiQuery"
import { useAuth } from "@/hooks/useAuth"
import { twoFactorService, type TwoFactorSetup } from "@/services/twoFactorService"
import { usePalette } from "@/theme/palette"

type Step =
  | { kind: "idle" }
  | { kind: "proof" }
  | { kind: "scan"; setup: TwoFactorSetup }
  | { kind: "codes"; codes: string[]; fresh: boolean }
  | { kind: "disable" }
  | { kind: "regenerate" }

/**
 * La verificacion en dos pasos: al entrar, ademas de la contrasena, el codigo de
 * una app autenticadora. En el celular no se puede escanear la propia pantalla,
 * asi que la clave se agrega con el enlace (abre la app autenticadora) o
 * copiandola a mano. Termina mostrando los codigos de recuperacion, una vez.
 */
export default function TwoFactorScreen() {
  const toast = useToast()
  const colors = usePalette()
  const { user, updateUser } = useAuth()
  const status = useApiQuery(["two-factor"], (signal) => twoFactorService.status(signal))
  const [step, setStep] = useState<Step>({ kind: "idle" })
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const data = status.data

  const go = (next: Step) => {
    setStep(next)
    setPassword("")
    setCode("")
    setError(undefined)
  }

  const run = async (work: () => Promise<void>) => {
    setBusy(true)
    setError(undefined)
    try {
      await work()
    } catch (err) {
      const apiError = toApiError(err)
      setError(apiError.serverMessage ?? userMessage(apiError))
      setCode("")
    }
    setBusy(false)
  }

  const saveCodes = (codes: string[]) =>
    void Share.share({ message: `Códigos de recuperación de Cash-Out (cada uno sirve una vez):\n\n${codes.join("\n")}` }).catch(() => undefined)

  return (
    <Screen back title="Verificación en dos pasos" subtitle="Al entrar, además de tu contraseña, te pedimos un código de tu app autenticadora. Así nadie entra solo con tu contraseña.">
      {status.error && !data ? (
        <ErrorState error={status.error} onRetry={status.reload} />
      ) : !data ? (
        <Skeleton height={150} />
      ) : step.kind === "idle" ? (
        <Card className="gap-3.5">
          <View className="flex-row items-start gap-3">
            <View className="size-10 items-center justify-center rounded-xl" style={{ backgroundColor: data.enabled ? `${colors.gain}1f` : colors.muted }}>
              <ShieldCheck size={20} color={data.enabled ? colors.gain : colors.mutedForeground} />
            </View>
            <View className="flex-1 gap-1">
              <Text weight="semibold" tone={data.enabled ? "gain" : "muted"} className="text-xs">
                {!data.available ? "No disponible" : data.enabled ? "Activa" : "Inactiva"}
              </Text>
              <Text className="text-sm leading-5">
                {!data.available
                  ? "No está disponible en este servidor por ahora."
                  : data.enabled
                    ? `Te pedimos el código cada vez que entras. Te quedan ${data.recoveryCodesLeft} códigos de recuperación.`
                    : "Funciona con Google Authenticator, Microsoft Authenticator, Authy o 1Password."}
              </Text>
            </View>
          </View>
          {data.enabled ? (
            <View className="gap-2">
              <Button label="Códigos de recuperación nuevos" variant="outline" onPress={() => go({ kind: "regenerate" })} />
              <Button label="Desactivar" variant="outline" onPress={() => go({ kind: "disable" })} />
            </View>
          ) : data.available ? (
            <Button label="Activar" onPress={() => go({ kind: "proof" })} />
          ) : null}
        </Card>
      ) : step.kind === "proof" ? (
        <Card className="gap-3.5">
          <Text className="text-sm leading-5">Primero confirma que eres tú.</Text>
          <Field label="Tu contraseña" value={password} onChangeText={setPassword} secureToggle autoComplete="current-password" autoCapitalize="none" />
          {error ? <Notice tone="error">{error}</Notice> : null}
          <Button
            label="Continuar"
            loading={busy}
            disabled={!password}
            onPress={() => void run(async () => go({ kind: "scan", setup: await twoFactorService.setup(password) }))}
          />
          <Button label="Cancelar" variant="outline" disabled={busy} onPress={() => go({ kind: "idle" })} />
        </Card>
      ) : step.kind === "scan" ? (
        <Card className="gap-3.5">
          <Text className="text-sm leading-5">
            1. Instala una app autenticadora si no tienes una.{"\n"}2. Agrega Cash-Out con el botón o escribiendo la clave.{"\n"}3. Escribe abajo los 6 dígitos que te muestra.
          </Text>
          <Button label="Abrir en mi app autenticadora" variant="outline" onPress={() => void Linking.openURL(step.setup.otpauthUri).catch(() => toast("No encontramos una app autenticadora: escribe la clave a mano."))} />
          <View className="items-center gap-1 rounded-xl bg-muted px-3 py-2.5">
            <Text tone="muted" className="text-xs">Clave para escribir a mano</Text>
            <Text weight="semibold" selectable className="text-center text-[15px] tracking-wider" style={{ fontVariant: ["tabular-nums"] }}>{step.setup.secret}</Text>
          </View>
          <Button
            label="Copiar la clave"
            variant="outline"
            onPress={() => void Clipboard.setStringAsync(step.setup.secret.replace(/\s/g, "")).then(() => toast("Clave copiada."))}
          />
          <Field label="Código de 6 dígitos" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} />
          {error ? <Notice tone="error">{error}</Notice> : null}
          <Button
            label="Activar"
            loading={busy}
            disabled={code.trim().length < 6}
            onPress={() => void run(async () => go({ kind: "codes", codes: await twoFactorService.enable(code.trim()), fresh: true }))}
          />
        </Card>
      ) : step.kind === "codes" ? (
        <Card className="gap-3.5">
          <Text weight="semibold" className="text-base">{step.fresh ? "Listo: guarda tus códigos de recuperación" : "Tus códigos nuevos"}</Text>
          <Text tone="muted" className="text-sm leading-5">
            Si pierdes el celular, entras con uno de estos códigos. Cada uno sirve una vez. Guárdalos en un lugar seguro: no los volveremos a mostrar.
          </Text>
          <View accessible accessibilityLabel={`Códigos de recuperación: ${step.codes.join(", ")}`} className="flex-row flex-wrap rounded-xl bg-muted p-3">
            {step.codes.map((item) => (
              <Text key={item} selectable className="w-1/2 py-1 text-center text-[15px] tracking-wider" style={{ fontVariant: ["tabular-nums"] }}>{item}</Text>
            ))}
          </View>
          <Button label="Guardar o compartir" variant="outline" onPress={() => saveCodes(step.codes)} />
          <Button
            label="Ya los guardé"
            onPress={() => {
              if (step.fresh) toast("Verificación en dos pasos activa: cerramos tus otras sesiones.")
              go({ kind: "idle" })
              status.reload()
            }}
          />
        </Card>
      ) : (
        <Card className="gap-3.5">
          <Text className="text-sm leading-5">
            {step.kind === "disable"
              ? "Tu cuenta quedará protegida solo por tu contraseña."
              : "Los códigos de recuperación que tienes ahora dejarán de servir."}
          </Text>
          {step.kind === "disable" ? (
            <Field label="Tu contraseña" value={password} onChangeText={setPassword} secureToggle autoComplete="current-password" autoCapitalize="none" />
          ) : null}
          <Field label="Código de tu app (o uno de recuperación)" value={code} onChangeText={setCode} autoComplete="one-time-code" textContentType="oneTimeCode" autoCapitalize="characters" maxLength={13} />
          {error ? <Notice tone="error">{error}</Notice> : null}
          <Button
            label={step.kind === "disable" ? "Desactivar" : "Generar códigos nuevos"}
            variant={step.kind === "disable" ? "destructive" : "primary"}
            loading={busy}
            disabled={!code.trim() || (step.kind === "disable" && !password)}
            onPress={() =>
              void run(async () => {
                if (step.kind === "disable") {
                  await twoFactorService.disable({ password, code: code.trim() })
                  if (user) updateUser({ ...user, twoFactorEnabled: false })
                  toast("Verificación en dos pasos desactivada.")
                  go({ kind: "idle" })
                  status.reload()
                } else {
                  go({ kind: "codes", codes: await twoFactorService.regenerate(code.trim()), fresh: false })
                }
              })
            }
          />
          <Button label="Cancelar" variant="outline" disabled={busy} onPress={() => go({ kind: "idle" })} />
        </Card>
      )}
    </Screen>
  )
}
