export type SupplierStoreNameSource = {
  store_name?: string | null
  company?: {
    nome_fantasia?: string | null
    razao_social?: string | null
  } | null
}

export function getSupplierStoreDisplayName(
  supplier: SupplierStoreNameSource | null | undefined,
): string {
  if (!supplier) return 'Fornecedor'

  const storeName = supplier.store_name?.trim()
  if (storeName) return storeName

  const nomeFantasia = supplier.company?.nome_fantasia?.trim()
  if (nomeFantasia) return nomeFantasia

  const razaoSocial = supplier.company?.razao_social?.trim()
  if (razaoSocial) return razaoSocial

  return 'Fornecedor'
}

export function getSupplierStoreNamePlaceholder(
  supplier: SupplierStoreNameSource | null | undefined,
): string {
  const fallback = supplier?.company?.nome_fantasia?.trim() || supplier?.company?.razao_social?.trim()
  return fallback ? `Ex.: ${fallback}` : 'Ex.: Minha Loja Fashion'
}
