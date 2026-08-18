import { SEARCH_STOPWORDS, SEARCH_SYNONYMS } from '../constants/search-synonyms'

const ACCENT_MAP: Record<string, string> = {
  á: 'a',
  à: 'a',
  ã: 'a',
  â: 'a',
  ä: 'a',
  é: 'e',
  è: 'e',
  ê: 'e',
  ë: 'e',
  í: 'i',
  ì: 'i',
  î: 'i',
  ï: 'i',
  ó: 'o',
  ò: 'o',
  õ: 'o',
  ô: 'o',
  ö: 'o',
  ú: 'u',
  ù: 'u',
  û: 'u',
  ü: 'u',
  ç: 'c',
  ñ: 'n',
}

export function removeAccents(value: string): string {
  return value.replace(/[^\u0000-\u007E]/g, (char) => ACCENT_MAP[char] ?? char)
}

export function normalizeSearchTerm(value: string): string {
  return removeAccents(value.trim().toLowerCase())
}

export function expandSearchToken(token: string): string[] {
  const normalized = normalizeSearchTerm(token)
  if (!normalized) return []
  return SEARCH_SYNONYMS[normalized] ?? [normalized]
}

export function parseSearchQuery(query: string): string[] {
  const normalized = normalizeSearchTerm(query)
  if (!normalized) return []

  const seen = new Set<string>()
  const tokens: string[] = []

  for (const rawToken of normalized.split(/\s+/)) {
    const token = rawToken.trim()
    if (token.length < 2 || SEARCH_STOPWORDS.has(token) || seen.has(token)) {
      continue
    }
    seen.add(token)
    tokens.push(token)
  }

  return tokens
}

export type SearchSuggestionType = 'produto' | 'marca' | 'categoria' | 'cor'

export type SearchSuggestion = {
  suggestion: string
  suggestionType: SearchSuggestionType
  score: number
}

export function mapSearchSuggestionRow(row: {
  suggestion: string
  suggestion_type: string
  score: number
}): SearchSuggestion {
  return {
    suggestion: row.suggestion,
    suggestionType: row.suggestion_type as SearchSuggestionType,
    score: row.score,
  }
}

export type ProductMatchSource =
  | 'nome'
  | 'cor'
  | 'tamanho'
  | 'marca'
  | 'categoria'
  | 'fornecedor'
  | 'descricao'
