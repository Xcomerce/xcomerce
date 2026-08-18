import { describe, expect, it } from 'vitest'
import {
  expandSearchToken,
  normalizeSearchTerm,
  parseSearchQuery,
  removeAccents,
} from './search-query'

describe('normalizeSearchTerm', () => {
  it('normaliza acentos e caixa', () => {
    expect(normalizeSearchTerm('  Algodão  ')).toBe('algodao')
  })
})

describe('removeAccents', () => {
  it('remove acentos comuns em PT', () => {
    expect(removeAccents('camiseta básica')).toBe('camiseta basica')
  })
})

describe('parseSearchQuery', () => {
  it('tokeniza e remove stopwords', () => {
    expect(parseSearchQuery('  Camiseta   de   Preta  ')).toEqual(['camiseta', 'preta'])
  })

  it('ignora tokens curtos', () => {
    expect(parseSearchQuery('a b camiseta')).toEqual(['camiseta'])
  })

  it('retorna vazio para string vazia', () => {
    expect(parseSearchQuery('   ')).toEqual([])
  })
})

describe('expandSearchToken', () => {
  it('expande sinônimos de cor', () => {
    expect(expandSearchToken('preta')).toContain('preto')
  })

  it('expande sinônimos de produto', () => {
    expect(expandSearchToken('camisa')).toContain('camiseta')
  })

  it('retorna token normalizado sem sinônimo', () => {
    expect(expandSearchToken('vestido')).toEqual(['vestido'])
  })
})
