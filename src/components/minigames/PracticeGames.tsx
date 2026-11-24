import { Pressable, View } from "react-native"
import { router } from "expo-router"
import { ChevronRight } from "lucide-react-native"
import { Card } from "@/components/ui/Card"
import { ErrorState, Skeleton } from "@/components/ui/States"
import { Text } from "@/components/ui/Text"
import { useApiQuery } from "@/hooks/useApiQuery"
import { formatTokens } from "@/lib/market"
import { MINIGAME_TYPE_LABEL, gameStats, packFor, sortByCost } from "@/lib/minigames"
import { minigameService } from "@/services/minigameService"
import { usePalette } from "@/theme/palette"

/** Los juegos de practica, de a uno: lo que cuestan, lo que pagan y tu mejor puntaje. Los gratis primero. */
export function PracticeGames() {
  const colors = usePalette()
  const games = useApiQuery(["minigames"], (signal) => minigameService.list(signal))
  const sessions = useApiQuery(["minigame-sessions"], (signal) => minigameService.sessions(signal))
  const stats = gameStats(sessions.data ?? [])
  // Solo los que la app sabe jugar: un juego nuevo del catalogo sin contenido aqui no se muestra.
  const playable = games.data ? sortByCost(games.data).filter((game) => packFor(game)) : null

  if (games.error && !games.data) return <ErrorState error={games.error} onRetry={games.reload} />
  if (!playable) return <Skeleton height={140} />
  if (playable.length === 0) return <Text tone="muted" className="px-1 text-sm">Todavía no hay juegos de práctica publicados.</Text>

  return (
    <Card className="px-0 py-1">
      {playable.map((game, i) => {
        const pack = packFor(game)!
        const length = pack.type === "SIMULATION" ? `${pack.rounds.length} rondas` : `${pack.questions.length} preguntas`
        const played = stats.get(game.title)
        return (
          <Pressable
            key={game.id}
            role="link"
            aria-label={`${game.title}, ${game.tokenCost === 0 ? "gratis" : formatTokens(game.tokenCost)}, premio hasta ${formatTokens(game.maxTokenReward)}`}
            onPress={() => router.push({ pathname: "/games/play/[id]", params: { id: String(game.id) } })}
            className={`min-h-16 flex-row items-center gap-3 px-4 py-3 active:bg-muted ${i > 0 ? "border-t border-border" : ""}`}
          >
            <View className="flex-1 gap-0.5">
              <Text weight="semibold" className="text-[15px]">{game.title}</Text>
              <Text tone="muted" className="text-xs">{MINIGAME_TYPE_LABEL[game.type]} · {length}</Text>
              <Text className="text-xs">
                <Text weight="medium" className="text-xs">{game.tokenCost === 0 ? "Gratis" : formatTokens(game.tokenCost)}</Text>
                <Text tone="muted" className="text-xs"> · gana hasta </Text>
                <Text weight="medium" tone="gain" className="text-xs">{formatTokens(game.maxTokenReward)}</Text>
                {played ? <Text tone="muted" className="text-xs"> · tu mejor: {played.best}</Text> : null}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.mutedForeground} />
          </Pressable>
        )
      })}
    </Card>
  )
}
