import { useEffect, useRef, useState } from "react"
import { Linking, View } from "react-native"
import { router } from "expo-router"
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera"
import { Camera } from "lucide-react-native"
import { Button } from "@/components/ui/Button"
import { Notice } from "@/components/ui/Notice"
import { Screen } from "@/components/ui/Screen"
import { EmptyState } from "@/components/ui/States"
import { haptics } from "@/lib/haptics"
import { toApiError, userMessage } from "@/api/errors"
import { ROOM_GAMES, findRoomGame, parseRoomQr } from "@/lib/rooms"

/** Lee el QR de una sala (el de la web o el de otro celular) y entra directo. */
export default function RoomScanScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [failed, setFailed] = useState<string | null>(null)
  // La camara avisa varias veces por segundo mientras ve el codigo: solo vale el primero.
  const locked = useRef(false)

  const onScanned = async ({ data }: BarcodeScanningResult) => {
    if (locked.current) return
    const room = parseRoomQr(data)
    // Un QR ajeno visto de reojo no deja el aviso pegado: se borra a los 3 s.
    if (!room) {
      setFailed("Ese QR no es de una sala de Cash-Out. Apunta al QR de la sala o escribe el código.")
      return
    }
    locked.current = true
    try {
      // El QR de la web dice el juego; uno con solo el codigo hay que buscarlo.
      const game = room.game ?? (await findRoomGame(room.code))
      if (!game) {
        locked.current = false
        setFailed("No encontramos una sala con ese código. Puede que ya se haya cerrado.")
        return
      }
      haptics.success()
      router.replace({ pathname: ROOM_GAMES[game].screen, params: { code: room.code } })
    } catch (err) {
      locked.current = false
      setFailed(userMessage(toApiError(err)))
    }
  }

  useEffect(() => {
    if (!failed) return
    const timer = setTimeout(() => setFailed(null), 3_000)
    return () => clearTimeout(timer)
  }, [failed])

  if (!permission) return <Screen back title="Escanear sala">{null}</Screen>

  if (!permission.granted) {
    return (
      <Screen back title="Escanear sala">
        <EmptyState
          icon={Camera}
          title="Necesitamos la cámara"
          message={
            permission.canAskAgain
              ? "La usamos solo para leer el QR de la sala. No guardamos fotos."
              : "Negaste el permiso. Puedes activarlo en los ajustes del teléfono o entrar escribiendo el código."
          }
          action={
            permission.canAskAgain
              ? { label: "Permitir cámara", onPress: () => void requestPermission() }
              : { label: "Abrir ajustes", onPress: () => void Linking.openSettings() }
          }
        />
        <Button label="Escribir el código" variant="outline" onPress={() => router.back()} />
      </Screen>
    )
  }

  return (
    <Screen back title="Escanear sala" subtitle="Apunta al QR que muestra quien creó la sala">
      <View className="aspect-square overflow-hidden rounded-3xl border border-border bg-black">
        <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={(result) => void onScanned(result)} />
      </View>
      {failed ? <Notice tone="error">{failed}</Notice> : null}
      <Button label="Escribir el código" variant="outline" onPress={() => router.back()} />
    </Screen>
  )
}
