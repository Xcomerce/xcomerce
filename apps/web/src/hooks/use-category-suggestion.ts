import { useEffect, useMemo, useState } from 'react'
import { suggestCategorySlugFromTitle } from '@keve/shared'

type CategoryLike = { id: string; slug: string; name: string }

export function useCategorySuggestion(
  title: string,
  categories: CategoryLike[],
  manuallySet: boolean,
) {
  const [suggestedCategoryId, setSuggestedCategoryId] = useState<string | null>(null)

  const slugMatch = useMemo(() => {
    if (manuallySet) return null
    return suggestCategorySlugFromTitle(title)
  }, [title, manuallySet])

  useEffect(() => {
    if (!slugMatch || categories.length === 0) {
      setSuggestedCategoryId(null)
      return
    }

    const match = categories.find((c) => c.slug === slugMatch)
    setSuggestedCategoryId(match?.id ?? null)
  }, [slugMatch, categories])

  return {
    suggestedCategoryId,
    suggestedCategory: categories.find((c) => c.id === suggestedCategoryId) ?? null,
    hasSuggestion: Boolean(suggestedCategoryId),
  }
}
