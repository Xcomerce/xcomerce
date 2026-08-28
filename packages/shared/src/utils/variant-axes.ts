import { dedupeVariantValues, normalizeVariantValue, variantArrayContains } from './variant-normalize'

export type VariantAxis = {
  name: string
  options: string[]
  images?: Record<string, string>
}

export const MAX_VARIANT_AXES = 4
export const MAX_OPTIONS_PER_AXIS = 60
export const COMBINATION_WARN_THRESHOLD = 300
export const COMBINATION_BLOCK_THRESHOLD = 1500
export const COMBINATION_PAGINATION_THRESHOLD = 100
export const COMBINATION_PAGE_SIZE = 100

export function countCombinations(axes: VariantAxis[]): number {
  const active = axes.filter((a) => a.options.length > 0)
  if (active.length === 0) return 0
  return active.reduce((acc, axis) => acc * axis.options.length, 1)
}

export function formatCombinationCount(axes: VariantAxis[]): string {
  const active = axes.filter((a) => a.options.length > 0)
  if (active.length === 0) return '0 combinações'
  const parts = active.map((a) => String(a.options.length))
  const total = countCombinations(axes)
  return `${parts.join(' × ')} = ${total} combinações`
}

export function wouldExceedCombinationLimit(axes: VariantAxis[], axisIndex: number): boolean {
  const simulated = axes.map((axis, i) =>
    i === axisIndex ? { ...axis, options: [...axis.options, '__new__'] } : axis,
  )
  return countCombinations(simulated) > COMBINATION_BLOCK_THRESHOLD
}

export function normalizeVariantAxes(axes: VariantAxis[]): VariantAxis[] {
  return axes
    .map((axis) => ({
      name: axis.name.trim(),
      options: dedupeVariantValues(axis.options),
      images: axis.images ?? {},
    }))
    .filter((axis) => axis.name.length > 0)
}

export function legacyFromVariantAxes(axes: VariantAxis[]): {
  tem_cor: boolean
  tem_tamanho: boolean
  cores: string[]
  tamanhos: string[]
  tipo_tamanho: 'roupa' | 'calcado' | 'numerico' | 'livre' | null
} {
  const corAxis = axes.find((a) => ['cor', 'cores'].includes(normalizeVariantValue(a.name)))
  const sizeAxis = axes.find((a) =>
    ['tamanho', 'tamanhos', 'numeracao', 'numeração'].includes(normalizeVariantValue(a.name)),
  )

  return {
    tem_cor: Boolean(corAxis?.options.length),
    tem_tamanho: Boolean(sizeAxis?.options.length),
    cores: corAxis?.options ?? [],
    tamanhos: sizeAxis?.options ?? [],
    tipo_tamanho: sizeAxis
      ? normalizeVariantValue(sizeAxis.name).includes('numer')
        ? 'calcado'
        : 'livre'
      : null,
  }
}

export function variantAxesFromLegacy(
  temCor: boolean,
  temTamanho: boolean,
  cores: string[],
  tamanhos: string[],
  tipoTamanho?: string | null,
): VariantAxis[] {
  const axes: VariantAxis[] = []
  if (temCor && cores.length > 0) {
    axes.push({ name: 'Cor', options: dedupeVariantValues(cores), images: {} })
  }
  if (temTamanho && tamanhos.length > 0) {
    axes.push({
      name: tipoTamanho === 'calcado' ? 'Numeração' : 'Tamanho',
      options: dedupeVariantValues(tamanhos),
      images: {},
    })
  }
  return axes
}

export function axisHasKnownValues(
  axisName: string,
  knownAxisNames: string[],
): boolean {
  const normalized = normalizeVariantValue(axisName)
  return knownAxisNames.some((name) => normalizeVariantValue(name) === normalized)
}

export function getOptionFromAxis(axis: VariantAxis, value: string): string | undefined {
  return axis.options.find((opt) => variantArrayContains([opt], value))
}
