import { http } from "@/api/client"
import { toApiError } from "@/api/errors"
import { API_URL } from "@/config"

/** Los juegos en grupo de la app, con su ruta en la web, su API y su pantalla en la app. */
export const ROOM_GAMES = {
  updown: { name: "¿Sube o baja?", webPath: "minijuegos/sube-o-baja", api: "/updown-rooms", screen: "/games/updown/[code]" },
  portfolio: { name: "Arma tu portafolio", webPath: "minijuegos/arma-tu-portafolio", api: "/portfolio-rooms", screen: "/games/portfolio/[code]" },
  // En la web la carrera vive en /carrera, fuera de /minijuegos.
  race: { name: "Carrera de trading", webPath: "carrera", api: "/race-rooms", screen: "/games/race/[code]" },
} as const

export type RoomGame = keyof typeof ROOM_GAMES

/** Los codigos de sala tienen 6 letras y numeros (GameRooms en el backend). */
export const ROOM_CODE_LENGTH = 6

/** Se aceptan en minuscula y con espacios o guiones de por medio. */
export function normalizeRoomCode(text: string): string {
  return text.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, ROOM_CODE_LENGTH)
}

/** La web publica: la API vive en <web>/api/v1, asi que se saca de ahi. */
const WEB_ORIGIN = API_URL.replace(/\/api\/v1$/, "")

/**
 * El link del QR lleva a la sala en la web: una laptop o un celular sin la app
 * entran por ahi, y la app reconoce el mismo link al escanearlo.
 */
export function roomJoinUrl(game: RoomGame, code: string): string {
  return `${WEB_ORIGIN}/${ROOM_GAMES[game].webPath}/${code}`
}

/**
 * Lo que se escaneo: un link de sala de la web (dice de que juego es) o solo el
 * codigo (game null: hay que averiguarlo). null si no es una sala.
 */
export function parseRoomQr(data: string): { game: RoomGame | null; code: string } | null {
  const text = data.trim()
  for (const [game, meta] of Object.entries(ROOM_GAMES) as [RoomGame, (typeof ROOM_GAMES)[RoomGame]][]) {
    const match = text.match(new RegExp(`/${meta.webPath}/([A-Za-z0-9]{6})(?![A-Za-z0-9])`))
    if (match) return { game, code: match[1].toUpperCase() }
  }
  return /^[A-Za-z0-9]{6}$/.test(text) ? { game: null, code: text.toUpperCase() } : null
}

/** Con solo el codigo no se sabe el juego: se pregunta a cada tipo de sala hasta encontrarla. */
export async function findRoomGame(code: string): Promise<RoomGame | null> {
  for (const game of Object.keys(ROOM_GAMES) as RoomGame[]) {
    try {
      await http.get(`${ROOM_GAMES[game].api}/${code}`)
      return game
    } catch (err) {
      if (toApiError(err).status !== 404) throw err
    }
  }
  return null
}
