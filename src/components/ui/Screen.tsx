import type { ReactNode } from "react"
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { ChevronLeft } from "lucide-react-native"
import { Text, Title } from "@/components/ui/Text"
import { usePalette } from "@/theme/palette"

interface ScreenProps {
  title: string
  subtitle?: string
  /** Un boton o icono a la derecha del titulo. */
  action?: ReactNode
  children: ReactNode
  /** Si se pasa, la lista se recarga al deslizar hacia abajo. */
  onRefresh?: () => void
  refreshing?: boolean
  /** Las pantallas que se abren encima de las pestanas tienen "Volver". */
  back?: boolean
}

/** El marco de cada pantalla: area segura arriba, titulo y contenido con scroll que el teclado no tapa. */
export function Screen({ title, subtitle, action, children, onRefresh, refreshing = false, back = false }: ScreenProps) {
  const colors = usePalette()

  return (
    <SafeAreaView edges={back ? ["top", "bottom"] : ["top"]} className="flex-1 bg-background">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerClassName="gap-5 px-5 pb-8 pt-4"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.mutedForeground} />
            ) : undefined
          }
        >
          {back ? (
            <Pressable role="button" aria-label="Volver" onPress={() => router.back()} className="-ml-2 flex-row items-center self-start p-2">
              <ChevronLeft size={22} color={colors.foreground} />
              <Text className="text-[15px]">Volver</Text>
            </Pressable>
          ) : null}
          <View className="flex-row items-end justify-between gap-3">
            <View className="flex-1 gap-1">
              <Title>{title}</Title>
              {subtitle ? <Text tone="muted" className="text-base">{subtitle}</Text> : null}
            </View>
            {action}
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
