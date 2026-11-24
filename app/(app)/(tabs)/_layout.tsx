import { Text } from "react-native"
import { Tabs } from "expo-router"
import { ArrowLeftRight, Gamepad2, House, LineChart, Target, UserRound, type LucideIcon } from "lucide-react-native"
import { usePalette } from "@/theme/palette"

const TABS: { name: string; title: string; icon: LucideIcon }[] = [
  { name: "index", title: "Resumen", icon: House },
  { name: "movements", title: "Movimientos", icon: ArrowLeftRight },
  { name: "goals", title: "Metas", icon: Target },
  { name: "portfolio", title: "Portafolio", icon: LineChart },
  { name: "games", title: "Juegos", icon: Gamepad2 },
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
        // Seis pestanas en 375 px: "Movimientos" entra solo con 10 px y sin relleno lateral.
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
            // La etiqueta crece poco con la letra del sistema, y si aun asi no entra en 1/6 de pantalla
            // ("Movimientos" en un Android de 360 o con letra grande) se achica en vez de cortarse.
            tabBarLabel: ({ color }) => (
              <Text
                maxFontSizeMultiplier={1.2}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={{ color, fontFamily: "Geist_500Medium", fontSize: 10 }}
              >
                {title}
              </Text>
            ),
            tabBarIcon: ({ color, focused }) => <Icon size={22} color={color} strokeWidth={focused ? 2.2 : 1.8} />,
          }}
        />
      ))}
    </Tabs>
  )
}
