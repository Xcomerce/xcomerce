const MOCK_SUPPLIERS: Record<string, string[]> = {
  'materiais-construcao': ['Distribuidora SP', 'Ferragens Central', 'EPI Brasil', 'Atacado Sul'],
  'cimento-argamassa': ['Cimento Forte Co.', 'Votoran Atacado', 'Lajes & Concreto SP'],
  ferragens: ['Ferragens Central', 'Atacado Sul', 'ImportTech'],
  'tintas-vernizes': ['Tintas & Cia', 'Pinturas Express', 'Distribuidora SP'],
  'alimentos-bebidas': ['Distribuidora Rio', 'Minas Laticínios', 'Alfa Bebidas', 'Beta Alimentos'],
  'equipamentos-industriais': ['Tech Parts', 'Gama Metalúrgica', 'EPI Brasil', 'Indústria Sul'],
  embalagens: ['Embalagens Express', 'Alfa Caixas', 'Papel & Cia'],
  servicos: ['Instalações Express', 'Manutenção Geral', 'Suporte Técnico'],
  tecnologia: ['Tech Solutions', 'Info Express', 'Sistemas B2B'],
  outros: ['Distribuidora Geral', 'Comércio Parceiro', 'Importações Variadas'],
}

export function getEligibleSuppliers(categorySlug: string | undefined) {
  if (!categorySlug) {
    return { count: 0, list: [] as string[], others: 0 }
  }
  const baseSlug = categorySlug.split('-')[0]
  const list =
    MOCK_SUPPLIERS[categorySlug] ||
    MOCK_SUPPLIERS[baseSlug] ||
    ['Fornecedor Parceiro A', 'Fornecedor Parceiro B', 'Distribuidora Local']
  return {
    count: list.length + 10,
    list: list.slice(0, 4),
    others: Math.max(0, list.length - 4 + 10),
  }
}
