import { useEffect, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { NewsItem } from "@/types/news"

const KEY = "cashout.saved-news"
const MAX = 100

/** Las noticias guardadas viven en este celular: no hay endpoint para ellas. */
export function useSavedNews() {
  const [saved, setSaved] = useState<NewsItem[]>([])

  useEffect(() => {
    let alive = true
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (alive && raw) setSaved(JSON.parse(raw) as NewsItem[])
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  const isSaved = (id: number) => saved.some((news) => news.id === id)

  const toggle = (news: NewsItem) => {
    setSaved((prev) => {
      const next = prev.some((item) => item.id === news.id) ? prev.filter((item) => item.id !== news.id) : [news, ...prev].slice(0, MAX)
      // Si no se puede guardar, igual queda marcada mientras la app este abierta.
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined)
      return next
    })
  }

  return { saved, isSaved, toggle }
}
