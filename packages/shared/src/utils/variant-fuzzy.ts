import { extractColorRoot, isSameColorFamily, normalizeVariantValue } from './variant-normalize'

/** Layout QWERTY para transposição de teclas vizinhas. */
const KEYBOARD_NEIGHBORS: Record<string, string[]> = {
  q: ['w', 'a'],
  w: ['q', 'e', 's', 'a'],
  e: ['w', 'r', 'd', 's'],
  r: ['e', 't', 'f', 'd'],
  t: ['r', 'y', 'g', 'f'],
  y: ['t', 'u', 'h', 'g'],
  u: ['y', 'i', 'j', 'h'],
  i: ['u', 'o', 'k', 'j'],
  o: ['i', 'p', 'l', 'k'],
  p: ['o', 'l'],
  a: ['q', 'w', 's', 'z'],
  s: ['a', 'w', 'e', 'd', 'x', 'z'],
  d: ['s', 'e', 'r', 'f', 'c', 'x'],
  f: ['d', 'r', 't', 'g', 'v', 'c'],
  g: ['f', 't', 'y', 'h', 'b', 'v'],
  h: ['g', 'y', 'u', 'j', 'n', 'b'],
  j: ['h', 'u', 'i', 'k', 'm', 'n'],
  k: ['j', 'i', 'o', 'l', 'm'],
  l: ['k', 'o', 'p'],
  z: ['a', 's', 'x'],
  x: ['z', 's', 'd', 'c'],
  c: ['x', 'd', 'f', 'v'],
  v: ['c', 'f', 'g', 'b'],
  b: ['v', 'g', 'h', 'n'],
  n: ['b', 'h', 'j', 'm'],
  m: ['n', 'j', 'k'],
}

function maxAllowedDistance(length: number): number {
  return length <= 4 ? 1 : 2
}

function areKeyboardNeighbors(a: string, b: string): boolean {
  const neighbors = KEYBOARD_NEIGHBORS[a]
  return neighbors?.includes(b) ?? false
}

function levenshteinWithKeyboard(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost =
        a[i - 1] === b[j - 1]
          ? 0
          : areKeyboardNeighbors(a[i - 1], b[j - 1])
            ? 0.5
            : 1

      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      )
    }
  }

  return dp[m][n]
}

export type FuzzySuggestion = {
  value: string
  distance: number
}

export function fuzzyVariantSuggest(
  query: string,
  candidates: string[],
  options?: { colorAxis?: boolean },
): FuzzySuggestion[] {
  const normalizedQuery = normalizeVariantValue(query)
  if (!normalizedQuery || candidates.length === 0) return []

  const maxDist = maxAllowedDistance(normalizedQuery.length)
  const results: FuzzySuggestion[] = []

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeVariantValue(candidate)
    if (!normalizedCandidate) continue
    if (normalizedCandidate === normalizedQuery) continue

    if (options?.colorAxis && !isSameColorFamily(query, candidate)) {
      const queryRoot = extractColorRoot(query)
      const candidateRoot = extractColorRoot(candidate)
      if (queryRoot !== candidateRoot && !normalizedCandidate.startsWith(`${queryRoot} `)) {
        continue
      }
      if (queryRoot === candidateRoot && normalizedQuery !== normalizedCandidate) {
        const queryTokens = normalizedQuery.split(' ').length
        const candidateTokens = normalizedCandidate.split(' ').length
        if (queryTokens === 1 && candidateTokens > 1) continue
        if (candidateTokens === 1 && queryTokens > 1) continue
      }
    }

    const distance = levenshteinWithKeyboard(normalizedQuery, normalizedCandidate)
    if (distance <= maxDist) {
      results.push({ value: candidate, distance })
    }
  }

  return results.sort((a, b) => a.distance - b.distance || a.value.localeCompare(b.value, 'pt-BR'))
}
