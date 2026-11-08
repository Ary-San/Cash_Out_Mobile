import type { NewsItem, NewsScope } from "@/types/news"

export const NEWS_SCOPES: readonly { value: NewsScope; label: string }[] = [
  { value: "mine", label: "Mis inversiones" },
  { value: "market", label: "Todo el mercado" },
  { value: "crypto", label: "Cripto" },
]

const MINUTE = 60_000
const HOUR = 60 * MINUTE
// Benzinga corrige erratas al rato de publicar; eso no cuenta como actualizacion.
const EDIT_GRACE = 5 * MINUTE

const shortDate = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short" })
const longDate = new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long" })

/** "hace 5 min", "hace 3 h"; pasado un dia, la fecha corta. */
export function formatNewsTime(iso: string, now: Date = new Date()): string {
  const elapsed = now.getTime() - new Date(iso).getTime()
  if (elapsed < MINUTE) return "hace un momento"
  if (elapsed < HOUR) return `hace ${Math.floor(elapsed / MINUTE)} min`
  if (elapsed < 24 * HOUR) return `hace ${Math.floor(elapsed / HOUR)} h`
  return shortDate.format(new Date(iso))
}

/** La hora del mural: la de la ultima edicion, que es por la que viene ordenado. */
export function formatNewsStamp(news: Pick<NewsItem, "publishedAt" | "updatedAt">, now: Date = new Date()): string {
  const time = formatNewsTime(news.updatedAt, now)
  const edited = new Date(news.updatedAt).getTime() - new Date(news.publishedAt).getTime() > EDIT_GRACE
  return edited ? `actualizada ${time}` : time
}

/** "benzinga" → "Benzinga". */
export function sourceLabel(source: string | null): string {
  if (!source) return "Fuente externa"
  return source.charAt(0).toUpperCase() + source.slice(1)
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

/** Agrupa por dia local, en el orden en que llegan: "Hoy", "Ayer" y despues la fecha. */
export function groupNewsByDay(items: readonly NewsItem[], now: Date = new Date()) {
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const labels = new Map([
    [dayKey(now), "Hoy"],
    [dayKey(yesterday), "Ayer"],
  ])

  const groups: { label: string; items: NewsItem[] }[] = []
  let current = ""
  for (const item of items) {
    const date = new Date(item.updatedAt)
    const key = dayKey(date)
    if (key !== current) {
      current = key
      const label = labels.get(key) ?? longDate.format(date)
      groups.push({ label: label.charAt(0).toUpperCase() + label.slice(1), items: [] })
    }
    groups[groups.length - 1].items.push(item)
  }
  return groups
}

/** Junta una pagina nueva con las anteriores sin repetir notas. */
export function appendNews(current: readonly NewsItem[], next: readonly NewsItem[]): NewsItem[] {
  const seen = new Set(current.map((item) => item.id))
  return [...current, ...next.filter((item) => !seen.has(item.id))]
}
