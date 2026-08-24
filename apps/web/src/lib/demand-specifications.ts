import {
  normalizeDemandSpecifications,
  type DemandInput,
  type DemandSpecification,
} from '@keve/shared'

export function resolveDemandSpecifications(
  input: Pick<DemandInput, 'especificacoes' | 'cor' | 'tamanho'>,
): DemandSpecification[] {
  return normalizeDemandSpecifications({
    especificacoes: input.especificacoes,
    cor: input.cor,
    tamanho: input.tamanho,
  })
}

export function sumSpecificationQuantities(
  specifications: Pick<DemandSpecification, 'quantidade'>[],
): number {
  if (specifications.length === 0) return 1

  return specifications.reduce((total, spec) => total + Math.max(1, Number(spec.quantidade) || 1), 0)
}

export function syncDemandQuantidadeFromSpecifications<T extends Pick<DemandInput, 'especificacoes' | 'quantidade'>>(
  input: T,
): T {
  return {
    ...input,
    quantidade: sumSpecificationQuantities(input.especificacoes ?? []),
  }
}

export function demandSpecificationsToLegacyFields(specifications: DemandSpecification[]) {
  if (specifications.length === 0) {
    return {
      quantidade: 1,
      cor: null,
      tamanho: null,
      especificacoes: [],
    }
  }

  const normalized = specifications.map((spec) => ({
    cor: spec.cor?.trim() || null,
    tamanho: spec.tamanho?.trim() || null,
    quantidade: Math.max(1, Number(spec.quantidade) || 1),
  }))

  const variantSpecs = normalized.filter((spec) => spec.cor || spec.tamanho)
  const storedSpecs = variantSpecs.length > 0 ? variantSpecs : normalized
  const first = variantSpecs[0] ?? normalized[0]

  return {
    quantidade: sumSpecificationQuantities(normalized),
    cor: first?.cor ?? null,
    tamanho: first?.tamanho ?? null,
    especificacoes: storedSpecs,
  }
}

export function demandSpecificationsFromRecord(
  demand: {
    quantidade?: number | null
    cor?: string | null
    tamanho?: string | null
    especificacoes?: DemandSpecification[] | null
  },
): DemandSpecification[] {
  if (Array.isArray(demand.especificacoes) && demand.especificacoes.length > 0) {
    return demand.especificacoes.map((spec) => ({
      cor: spec.cor ?? '',
      tamanho: spec.tamanho ?? '',
      quantidade: spec.quantidade ?? 1,
    }))
  }

  const cor = demand.cor?.trim()
  const tamanho = demand.tamanho?.trim()
  if (cor || tamanho) {
    return [
      {
        cor: demand.cor ?? '',
        tamanho: demand.tamanho ?? '',
        quantidade: demand.quantidade ?? 1,
      },
    ]
  }

  return []
}

export function prepareDemandPayload(input: DemandInput) {
  const synced = syncDemandQuantidadeFromSpecifications(input)
  const variantFields = demandSpecificationsToLegacyFields(synced.especificacoes ?? [])
  const cidades =
    synced.cidades && synced.cidades.length > 0
      ? synced.cidades
      : synced.cidade && synced.uf
        ? [{ cidade: synced.cidade, uf: synced.uf.toUpperCase() }]
        : []
  const primaryCity = cidades[0]

  return {
    ...synced,
    cidades,
    cidade: primaryCity?.cidade ?? synced.cidade,
    uf: primaryCity?.uf?.toUpperCase() ?? synced.uf?.toUpperCase(),
    quantidade: variantFields.quantidade,
    cor: variantFields.cor,
    tamanho: variantFields.tamanho,
    especificacoes: variantFields.especificacoes,
  }
}
