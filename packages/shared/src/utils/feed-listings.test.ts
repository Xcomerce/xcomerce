import { describe, expect, it } from 'vitest'
import {
  expandProductsToFeedListings,
  formatVariationOptionLabel,
  getProductVariationCount,
} from './feed-listings'

describe('getProductVariationCount', () => {
  it('retorna 0 para produto sem variações', () => {
    expect(getProductVariationCount({ id: '1' })).toBe(0)
  })

  it('prioriza estoque_variacoes materializado', () => {
    expect(
      getProductVariationCount({
        id: '1',
        variant_axes: [{ name: 'Cor', options: ['Azul', 'Preto'] }],
        estoque_variacoes: [{}, {}, {}],
      }),
    ).toBe(3)
  })

  it('calcula combinações a partir de variant_axes', () => {
    expect(
      getProductVariationCount({
        id: '1',
        variant_axes: [
          { name: 'Cor', options: ['Azul', 'Preto', 'Branco'] },
          { name: 'Tamanho', options: ['P', 'M', 'G', 'GG'] },
        ],
      }),
    ).toBe(12)
  })

  it('usa fallback legado tem_cor x tem_tamanho', () => {
    expect(
      getProductVariationCount({
        id: '1',
        tem_cor: true,
        cores: ['Azul', 'Preto'],
        tem_tamanho: true,
        tamanhos: ['P', 'M', 'G'],
      }),
    ).toBe(6)
  })

  it('retorna 1 para produto legado com uma única opção', () => {
    expect(
      getProductVariationCount({
        id: '1',
        tem_cor: true,
        cores: ['Branco'],
      }),
    ).toBe(1)
  })
})

describe('formatVariationOptionLabel', () => {
  it('pluraliza em português', () => {
    expect(formatVariationOptionLabel(1)).toBe('1 opção')
    expect(formatVariationOptionLabel(49)).toBe('49 opções')
  })
})

describe('expandProductsToFeedListings', () => {
  it('propaga feedVariationCount igual em todos os cards expandidos por cor', () => {
    const listings = expandProductsToFeedListings([
      {
        id: 'p1',
        variant_axes: [
          { name: 'Cor', options: ['Azul', 'Preto', 'Branco'] },
          { name: 'Tamanho', options: ['P', 'M', 'G', 'GG'] },
        ],
      },
    ])

    expect(listings).toHaveLength(3)
    expect(listings.every((listing) => listing.feedVariationCount === 12)).toBe(true)
  })

  it('define feedVariationCount 0 para produto simples', () => {
    const listings = expandProductsToFeedListings([{ id: 'p2' }])

    expect(listings).toHaveLength(1)
    expect(listings[0]?.feedVariationCount).toBe(0)
  })
})
