import {
  normalizeDemandSpecifications,
  type DemandInput,
  type DemandSpecification,
} from '@keve/shared'

export function resolveDemandSpecifications(
  input: Pick<DemandInput, 'especificacoes' | 'cor' | 'tamanho' | 'use_variations' | 'quantidade'>,
): DemandSpecification[] {
  if (input.use_variations === false) return []
  return normalizeDemandSpecifications({
    especificacoes: input.especificacoes,
    cor: input.cor,
    tamanho: input.tamanho,
  })
}

export function sumSpecificationQuantities(
  specifications: Pick<DemandSpecification, 'quantidade'>[],
  fallbackQuantity?: number,
): number {
  if (specifications.length === 0) return fallbackQuantity && fallbackQuantity > 0 ? fallbackQuantity : 1

  const total = specifications.reduce(
    (sum, spec) => sum + (typeof spec.quantidade === 'number' && spec.quantidade > 0 ? spec.quantidade : 0),
    0,
  )
  return total > 0 ? total : 1
}

export function syncDemandQuantidadeFromSpecifications<T extends Pick<DemandInput, 'especificacoes' | 'quantidade' | 'use_variations'>>(
  input: T,
): T {
  if (input.use_variations === false) {
    return { ...input, quantidade: input.quantidade && input.quantidade > 0 ? input.quantidade : 1 }
  }
  return {
    ...input,
    quantidade: sumSpecificationQuantities(input.especificacoes ?? []),
  }
}

export function demandSpecificationsToLegacyFields(
  specifications: DemandSpecification[],
  useVariations = true,
) {
  if (!useVariations || specifications.length === 0) {
    return {
      quantidade: 1,
      cor: null,
      tamanho: null,
      especificacoes: [],
    }
  }

  const normalized = specifications.map((spec) => ({
    cor: spec.cor?.trim() || spec.values?.Cor?.trim() || null,
    tamanho: spec.tamanho?.trim() || spec.values?.Tamanho?.trim() || null,
    values: spec.values ?? {},
    quantidade:
      typeof spec.quantidade === 'number' && spec.quantidade > 0 ? spec.quantidade : undefined,
  }))

  const variantSpecs = normalized.filter((spec) => spec.cor || spec.tamanho || Object.values(spec.values).some(Boolean))
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
    especificacoes?: Array<{
      cor?: string | null
      tamanho?: string | null
      values?: Record<string, string>
      quantidade?: number | null
    }> | null
    variant_axes?: Array<{ name: string }> | null
  },
): DemandSpecification[] {
  if (Array.isArray(demand.especificacoes) && demand.especificacoes.length > 0) {
    return demand.especificacoes.map((spec) => ({
      cor: spec.cor ?? spec.values?.Cor ?? '',
      tamanho: spec.tamanho ?? spec.values?.Tamanho ?? '',
      values: spec.values ?? {},
      quantidade:
        typeof spec.quantidade === 'number' && spec.quantidade > 0 ? spec.quantidade : undefined,
    }))
  }

  const cor = demand.cor?.trim()
  const tamanho = demand.tamanho?.trim()
  if (cor || tamanho) {
    return [
      {
        cor: demand.cor ?? '',
        tamanho: demand.tamanho ?? '',
        values: { ...(cor ? { Cor: cor } : {}), ...(tamanho ? { Tamanho: tamanho } : {}) },
        quantidade: demand.quantidade ?? undefined,
      },
    ]
  }

  return []
}

export function prepareDemandPayload(input: DemandInput) {
  const synced = syncDemandQuantidadeFromSpecifications(input)
  const variantFields = demandSpecificationsToLegacyFields(
    synced.especificacoes ?? [],
    synced.use_variations !== false,
  )
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
    quantidade: synced.use_variations === false ? synced.quantidade ?? 1 : variantFields.quantidade,
    cor: variantFields.cor,
    tamanho: variantFields.tamanho,
    especificacoes: synced.use_variations === false ? [] : variantFields.especificacoes,
    variant_axes: synced.variant_axes ?? [],
  }
}

export function getDemandPublishMissingFields(values: DemandInput): string[] {
  const missing: string[] = []
  if (!values.titulo?.trim() || values.titulo.trim().length < 3) missing.push('produto')
  if (!values.category_id) missing.push('categoria')
  if (!values.cidades?.length && (!values.cidade || !values.uf)) missing.push('cidade')
  if (values.use_variations === false) {
    if (!values.quantidade || values.quantidade < 1) missing.push('quantidade')
  } else {
    const specs = values.especificacoes ?? []
    if (specs.length === 0 || !specs.some((s) => s.quantidade && s.quantidade >= 1)) {
      missing.push('quantidade')
    }
  }
  return missing
}
