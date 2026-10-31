import { useRef, useState } from "react"
import { Linking, View } from "react-native"
import { router } from "expo-router"
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera"
import { Camera } from "lucide-react-native"
import { toApiError, userMessage } from "@/api/errors"
import { DraftList } from "@/components/assistant/DraftCard"
import { Button } from "@/components/ui/Button"
import { Notice } from "@/components/ui/Notice"
import { Screen } from "@/components/ui/Screen"
import { EmptyState } from "@/components/ui/States"
import { Text } from "@/components/ui/Text"
import { assistantService } from "@/services/assistantService"
import type { Draft } from "@/types/assistant"

type Step = { name: "scanning" } | { name: "reading" } | { name: "done"; drafts: Draft[] } | { name: "failed"; message: string }

/** Lee el QR de una boleta SUNAT y lo convierte en una tarjeta para revisar, igual que una frase. */
export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [step, setStep] = useState<Step>({ name: "scanning" })
  // La camara avisa varias veces por segundo mientras ve el codigo: solo vale el primero.
  const locked = useRef(false)

  const onScanned = async ({ data }: BarcodeScanningResult) => {
    if (locked.current) return
    locked.current = true
    setStep({ name: "reading" })
    try {
      const drafts = await assistantService.drafts({ qr: data })
      setStep(
        drafts.length > 0
          ? { name: "done", drafts }
          : { name: "failed", message: "Ese código no parece de una boleta o factura electrónica." },
      )
    } catch (err) {
      setStep({ name: "failed", message: userMessage(toApiError(err)) })
    }
  }

  const scanAgain = () => {
    locked.current = false
    setStep({ name: "scanning" })
  }

  const manual = (
    <Button label="Ingresar a mano" variant="outline" onPress={() => router.replace("/movement/new")} />
  )

  // Todavia no se sabe si hay permiso: no se muestra nada para no parpadear.
  if (!permission) return <Screen back title="Escanear boleta">{null}</Screen>

  if (!permission.granted) {
    return (
      <Screen back title="Escanear boleta">
        <EmptyState
          icon={Camera}
          title="Necesitamos la cámara"
          message={
            permission.canAskAgain
              ? "La usamos solo para leer el código QR de la boleta. No guardamos fotos."
              : "Negaste el permiso. Puedes activarlo en los ajustes del teléfono o registrar la boleta a mano."
          }
          action={
            permission.canAskAgain
              ? { label: "Permitir cámara", onPress: () => void requestPermission() }
              : { label: "Abrir ajustes", onPress: () => void Linking.openSettings() }
          }
        />
        {manual}
      </Screen>
    )
  }

  return (
    <Screen back title="Escanear boleta" subtitle="Apunta al código QR de la boleta o factura">
      {step.name === "scanning" || step.name === "reading" ? (
        <View className="aspect-square overflow-hidden rounded-3xl border border-border bg-black">
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={step.name === "scanning" ? (result) => void onScanned(result) : undefined}
          />
        </View>
      ) : null}

      {step.name === "reading" ? <Text tone="muted" className="text-center text-sm">Leyendo la boleta…</Text> : null}

      {step.name === "failed" ? (
        <>
          <Notice tone="error">{step.message}</Notice>
          <Button label="Escanear otra vez" onPress={scanAgain} />
        </>
      ) : null}

      {step.name === "done" ? (
        <>
          <DraftList drafts={step.drafts} onSaved={() => undefined} />
          <Button label="Escanear otra boleta" variant="outline" onPress={scanAgain} />
        </>
      ) : null}

      {step.name !== "done" ? manual : null}
    </Screen>
  )
}
