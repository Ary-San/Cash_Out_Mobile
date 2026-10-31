import { LineChart } from "lucide-react-native"
import { Screen } from "@/components/ui/Screen"
import { EmptyState } from "@/components/ui/States"

export default function PortfolioScreen() {
  return (
    <Screen title="Portafolio" subtitle="Tus inversiones y el mercado">
      <EmptyState
        icon={LineChart}
        title="Tu portafolio está vacío"
        message="Vas a poder seguir acciones, ver su historial y comprar con tus tokens."
      />
    </Screen>
  )
}
