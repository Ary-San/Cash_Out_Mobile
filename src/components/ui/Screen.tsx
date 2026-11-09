import type { ReactNode } from "react"
import { FlatList, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, View, type ListRenderItem } from "react-native"
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
export function Screen({ children, onRefresh, refreshing = false, back = false, ...header }: ScreenProps) {
  const colors = usePalette()

  return (
    <SafeAreaView edges={back ? ["top", "bottom"] : ["top"]} className="flex-1 bg-background">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          // En tablet el contenido no se estira: queda centrado con un ancho de lectura.
          contentContainerClassName="w-full max-w-[640px] gap-5 self-center px-5 pb-8 pt-4"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.mutedForeground} />
            ) : undefined
          }
        >
          <ScreenHeader back={back} {...header} />
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

interface ListScreenProps<T> extends Omit<ScreenProps, "children"> {
  /** Lo que va arriba de la lista y se desplaza con ella: filtros, avisos, estados de carga o vacio. */
  children?: ReactNode
  items: readonly T[]
  keyExtractor: (item: T) => string
  renderItem: ListRenderItem<T>
  /** Debajo de la lista, por ejemplo "Ver mas". */
  footer?: ReactNode
}

/**
 * Igual que Screen, pero la lista larga va en un FlatList: solo se dibujan las
 * filas que se ven, y el resto se recicla al desplazarse.
 */
export function ListScreen<T>({ children, items, keyExtractor, renderItem, footer, onRefresh, refreshing = false, back = false, ...header }: ListScreenProps<T>) {
  const colors = usePalette()

  return (
    <SafeAreaView edges={back ? ["top", "bottom"] : ["top"]} className="flex-1 bg-background">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerClassName="w-full max-w-[640px] self-center px-5 pb-8 pt-4"
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View className={`gap-5 ${items.length > 0 ? "pb-5" : ""}`}>
              <ScreenHeader back={back} {...header} />
              {children}
            </View>
          }
          ListFooterComponent={footer ? <View className="pt-5">{footer}</View> : undefined}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.mutedForeground} />
            ) : undefined
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function ScreenHeader({ title, subtitle, action, back }: Pick<ScreenProps, "title" | "subtitle" | "action" | "back">) {
  const colors = usePalette()
  return (
    <>
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
    </>
  )
}
