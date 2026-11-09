import type { ReactNode } from "react"
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from "react-native"
import Animated, { SlideInDown } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Title } from "@/components/ui/Text"

interface SheetProps {
  visible: boolean
  onClose: () => void
  title?: string
  /** Mientras se guarda no se cierra tocando afuera. */
  locked?: boolean
  children: ReactNode
}

/** Una hoja que sube desde abajo: aportar, crear o editar sin dejar la pantalla. */
export function Sheet({ visible, onClose, title, locked = false, children }: SheetProps) {
  const insets = useSafeAreaInsets()
  const close = () => {
    if (!locked) onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable accessibilityLabel="Cerrar" onPress={close} className="flex-1 bg-black/45" />
        {/* Animated.View no toma las clases de NativeWind: anima el contenedor y el View de adentro lleva el estilo. */}
        <Animated.View entering={SlideInDown.duration(320)} accessibilityViewIsModal style={{ width: "100%", maxWidth: 640, alignSelf: "center" }}>
          <View className="gap-4 rounded-t-[28px] bg-card px-5 pt-2.5" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="h-[5px] w-10 self-center rounded-full bg-border" />
            {title ? <Title size="md">{title}</Title> : null}
            {children}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
