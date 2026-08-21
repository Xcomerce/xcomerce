import { describe, expect, it } from 'vitest'
import {
  expandSearchToken,
  isValidSearchToken,
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

  it('mantém tokens de tamanho de 1 caractere válidos', () => {
    expect(parseSearchQuery('camiseta preta m')).toEqual(['camiseta', 'preta', 'm'])
    expect(parseSearchQuery('camiseta g p')).toEqual(['camiseta', 'g', 'p'])
  })

  it('ignora tokens de 1 caractere que não são tamanho', () => {
    expect(parseSearchQuery('camiseta x preta')).toEqual(['camiseta', 'preta'])
  })
})

describe('isValidSearchToken', () => {
  it('aceita tokens longos e tamanhos P/M/G', () => {
    expect(isValidSearchToken('camiseta')).toBe(true)
    expect(isValidSearchToken('m')).toBe(true)
    expect(isValidSearchToken('g')).toBe(true)
    expect(isValidSearchToken('p')).toBe(true)
  })

  it('rejeita stopwords e tokens inválidos curtos', () => {
    expect(isValidSearchToken('de')).toBe(false)
    expect(isValidSearchToken('x')).toBe(false)
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
