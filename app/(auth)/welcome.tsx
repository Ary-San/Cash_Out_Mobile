import { useCallback, useState } from "react"
import { Image, Text as NativeText, ScrollView, View, useWindowDimensions } from "react-native"
import { router, useFocusEffect } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { ShieldCheck } from "lucide-react-native"
import { Button } from "@/components/ui/Button"
import { Text, Title } from "@/components/ui/Text"
import { GoalToTokens } from "@/components/welcome/GoalToTokens"
import { SilkBackground } from "@/components/welcome/SilkBackground"
import { usePalette } from "@/theme/palette"

const ICON = require("../../assets/images/icon.png")

/**
 * Lo primero que ve quien abre la app sin sesion: una meta que se cumple y se
 * vuelve fichas, la promesa de la web y los dos caminos (crear cuenta o entrar).
 */
export default function WelcomeScreen() {
  const colors = usePalette()
  const { height } = useWindowDimensions()
  // En telefonos bajos (iPhone SE, Android chicos) el anillo y el titular se achican para que entren los botones.
  const compact = height < 720
  // Detras del login o del registro la pantalla sigue montada: la seda y el anillo se pausan.
  const [focused, setFocused] = useState(true)
  useFocusEffect(
    useCallback(() => {
      setFocused(true)
      return () => setFocused(false)
    }, []),
  )

  return (
    <View className="flex-1 bg-background">
      <SilkBackground active={focused} />
      <SafeAreaView className="flex-1">
        {/* Con scroll: con letra grande o en pantallas chicas los botones siguen alcanzables. */}
        <ScrollView contentContainerClassName="w-full max-w-[480px] flex-grow self-center px-6" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-2 pt-3">
          <Image source={ICON} accessibilityIgnoresInvertColors style={{ width: 28, height: 28, borderRadius: 8 }} />
          <Text weight="semibold" className="text-base">Cash-Out</Text>
        </View>

        <View className="flex-1 items-center justify-center py-4">
          <GoalToTokens active={focused} size={compact ? 164 : 208} />
        </View>

        <View className="gap-3 pb-2">
          {/* Title y no Text: Text trae Geist (font-sans) y le ganaria a la serif. */}
          <Title maxFontSizeMultiplier={1.15} className={compact ? "text-[36px] leading-[38px]" : "text-[44px] leading-[46px]"}>
            Ahorra, planifica e invierte{" "}
            <NativeText className="font-display-italic text-accent-ink">sin arriesgar tu dinero</NativeText>
          </Title>
          <Text tone="muted" className="text-base leading-6">
            Cumple tus metas de ahorro y gana fichas para practicar con precios reales del mercado.
          </Text>
          <View className="flex-row items-center gap-2">
            <ShieldCheck size={16} color={colors.mutedForeground} />
            <Text tone="muted" className="flex-1 text-[13px]">Inviertes con fichas: tu dinero real nunca está en juego.</Text>
          </View>
        </View>

        <View className="gap-2.5 pb-4 pt-4">
          <Button label="Crear cuenta gratis" onPress={() => router.push("/register")} />
          <Button label="Ya tengo cuenta" variant="outline" onPress={() => router.push("/login")} />
        </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}
