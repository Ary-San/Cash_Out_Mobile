import { Gamepad2 } from "lucide-react-native"
import { Screen } from "@/components/ui/Screen"
import { EmptyState } from "@/components/ui/States"

export default function GamesScreen() {
  return (
    <Screen title="Minijuegos" subtitle="Aprende jugando con tu grupo">
      <EmptyState
        icon={Gamepad2}
        title="Únete a una sala"
        message="Vas a poder entrar con el código o escaneando el QR que muestra el anfitrión."
      />
    </Screen>
  )
}
