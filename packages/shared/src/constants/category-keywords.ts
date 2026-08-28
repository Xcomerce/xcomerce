/** Palavras-chave para sugestão automática de categoria a partir do título. */

export type CategoryKeywordRule = {
  keywords: string[]
  categorySlug: string
}

export const CATEGORY_KEYWORD_RULES: CategoryKeywordRule[] = [
  {
    keywords: ['camiseta', 'camisa', 'blusa', 'regata', 'moletom', 'jaqueta', 'casaco', 'calca', 'calça', 'bermuda', 'short', 'vestido', 'saia'],
    categorySlug: 'camisetas',
  },
  {
    keywords: ['tenis', 'tênis', 'sapato', 'sandalia', 'sandália', 'chinelo', 'bota'],
    categorySlug: 'calcados',
  },
  {
    keywords: ['carregador', 'cabo', 'fone', 'headphone', 'celular', 'smartphone', 'tablet', 'notebook', 'computador'],
    categorySlug: 'eletronicos',
  },
  {
    keywords: ['caderno', 'caneta', 'lapis', 'lápis', 'mochila', 'estojo'],
    categorySlug: 'papelaria',
  },
  {
    keywords: ['cadeira', 'mesa', 'armario', 'armário', 'estante', 'sofa', 'sofá'],
    categorySlug: 'moveis',
  },
]

export function suggestCategorySlugFromTitle(title: string): string | null {
  const normalized = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()

  if (normalized.length < 3) return null

  const tokens = normalized.split(/\s+/)

  for (const rule of CATEGORY_KEYWORD_RULES) {
    for (const keyword of rule.keywords) {
      const kw = keyword.normalize('NFD').replace(/\p{M}/gu, '')
      if (tokens.some((t) => t.includes(kw) || kw.includes(t))) {
        return rule.categorySlug
      }
      if (normalized.includes(kw)) {
        return rule.categorySlug
      }
    }
  }

  return null
}
