export type CategoryNode = {
  id: string
  parent_id: string | null
}

export function getRootCategories<T extends CategoryNode>(categories: T[]): T[] {
  return categories.filter((category) => category.parent_id === null)
}

export function getLeafCategories<T extends CategoryNode>(categories: T[]): T[] {
  return categories.filter((category) => category.parent_id !== null)
}

export function getDescendantCategoryIds(
  rootId: string,
  categories: CategoryNode[],
): string[] {
  const childIds = categories
    .filter((category) => category.parent_id === rootId)
    .map((category) => category.id)

  return [rootId, ...childIds]
}
