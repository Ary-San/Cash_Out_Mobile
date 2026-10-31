import { Tabs } from "expo-router"
import { ArrowLeftRight, Gamepad2, House, LineChart, UserRound, type LucideIcon } from "lucide-react-native"
import { usePalette } from "@/theme/palette"

const TABS: { name: string; title: string; icon: LucideIcon }[] = [
  { name: "index", title: "Resumen", icon: House },
  { name: "movements", title: "Movimientos", icon: ArrowLeftRight },
  { name: "portfolio", title: "Portafolio", icon: LineChart },
  { name: "games", title: "Minijuegos", icon: Gamepad2 },
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
            tabBarIcon: ({ color, focused }) => <Icon size={22} color={color} strokeWidth={focused ? 2.2 : 1.8} />,
          }}
        />
      ))}
    </Tabs>
  )
}
