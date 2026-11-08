import { useState } from "react"
import { userMessage, toApiError } from "@/api/errors"
import { useToast } from "@/components/ui/Toast"
import { useApiQuery } from "@/hooks/useApiQuery"
import { useAsyncAction } from "@/hooks/useAsyncAction"
import { appendNews } from "@/lib/news"
import { newsService } from "@/services/newsService"
import type { NewsItem, NewsScope } from "@/types/news"

interface MorePages {
  key: string
  items: NewsItem[]
  next: string | null
}

/** La primera pagina del mural y las de "Cargar más"; al cambiar el filtro, las extra se descartan solas. */
export function useNewsFeed(scope: NewsScope | undefined, symbol: string | undefined) {
  const toast = useToast()
  const key = `${scope}|${symbol ?? ""}`
  const first = useApiQuery(["news", scope ?? null, symbol ?? null], (signal) =>
    scope ? newsService.feed({ scope, symbol }, signal) : Promise.resolve(null),
  )
  const [more, setMore] = useState<MorePages>()
  const extra = more?.key === key ? more : undefined
  const next = extra ? extra.next : first.data?.nextPageToken

  const loadMore = useAsyncAction(async () => {
    if (!next || !scope) return
    try {
      const page = await newsService.feed({ scope, symbol, pageToken: next })
      setMore((prev) => ({ key, items: appendNews(prev?.key === key ? prev.items : [], page.items), next: page.nextPageToken }))
    } catch (err) {
      toast(userMessage(toApiError(err)))
    }
  })

  return {
    items: first.data ? appendNews(first.data.items, extra?.items ?? []) : undefined,
    error: first.error,
    isRefreshing: first.isRefreshing,
    reload: first.reload,
    hasMore: Boolean(next) && !first.isRefreshing,
    loadMore: loadMore.run,
    isLoadingMore: loadMore.isPending,
  }
}
