import { productSchema, type ProductInput } from '@keve/shared'

const FIELD_LABELS: Record<string, string> = {
  nome: 'nome do produto',
  category_id: 'categoria',
  preco_referencia: 'preço unitário',
  variant_axes: 'opções de variação',
  estoque_variacoes: 'estoque das variações',
}

export function getProductPublishMissingFields(values: ProductInput): string[] {
  const result = productSchema.safeParse({ ...values, is_active: true, is_draft: false })
  if (result.success) return []

  const missing = new Set<string>()
  for (const issue of result.error.issues) {
    const key = issue.path[0]
    if (typeof key === 'string') {
      missing.add(FIELD_LABELS[key] ?? key)
    }
  }

  const axes = values.variant_axes ?? []
  if (axes.some((a) => a.name && (a.options?.length ?? 0) === 0)) {
    missing.add('opções de variação')
  }

  if (!values.nome?.trim()) missing.add('nome do produto')
  if (!values.category_id) missing.add('categoria')
  if (values.preco_referencia == null) missing.add('preço unitário')

  return [...missing]
}
