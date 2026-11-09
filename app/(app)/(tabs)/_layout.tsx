import { Text } from "react-native"
import { Tabs } from "expo-router"
import { ArrowLeftRight, House, LineChart, Target, UserRound, type LucideIcon } from "lucide-react-native"
import { usePalette } from "@/theme/palette"

const TABS: { name: string; title: string; icon: LucideIcon }[] = [
  { name: "index", title: "Resumen", icon: House },
  { name: "movements", title: "Movimientos", icon: ArrowLeftRight },
  { name: "goals", title: "Metas", icon: Target },
  { name: "portfolio", title: "Portafolio", icon: LineChart },
  { name: "profile", title: "Perfil", icon: UserRound },
]

export default function TabsLayout() {
  const colors = usePalette()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        // Cinco pestanas en 375 px: "Movimientos" entra solo con 10 px y sin relleno lateral.
        tabBarLabelStyle: { fontFamily: "Geist_500Medium", fontSize: 10 },
        tabBarItemStyle: { paddingHorizontal: 0 },
      }}
    >
      {TABS.map(({ name, title, icon: Icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            // La etiqueta crece poco con la letra del sistema: con mas, "Movimientos" no entra en 1/5 de pantalla.
            tabBarLabel: ({ color }) => (
              <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ color, fontFamily: "Geist_500Medium", fontSize: 10 }}>
                {title}
              </Text>
            ),
            tabBarIcon: ({ color, focused }) => <Icon size={22} color={color} strokeWidth={focused ? 2.2 : 1.8} />,
          }}
        />
      ))}
      {/* Minijuegos sale de las pestanas hasta tener contenido; la ruta queda para entrar desde el Portafolio. */}
      <Tabs.Screen name="games" options={{ href: null }} />
    </Tabs>
  )
}
