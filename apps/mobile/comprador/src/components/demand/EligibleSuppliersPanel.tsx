import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { Check, MapPin } from 'lucide-react-native'
import { Card } from '@/components/ui/Card'
import { getEligibleSuppliers } from '@/lib/new-demand-utils'

type Props = {
  categorySlug?: string
  categoryName?: string
  cidade: string
  uf: string
  deliverySummary?: string
}

export function EligibleSuppliersPanel({ categorySlug, categoryName, cidade, uf, deliverySummary }: Props) {
  const [isSearching, setIsSearching] = useState(false)
  const eligible = getEligibleSuppliers(categorySlug)

  useEffect(() => {
    if (!categorySlug) {
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    const timer = setTimeout(() => setIsSearching(false), 700)
    return () => clearTimeout(timer)
  }, [categorySlug, cidade, uf])

  if (!categorySlug) {
    return (
      <Card className="bg-slate-50">
        <Text className="text-xs font-medium uppercase tracking-wide text-slate-500">Fornecedores elegíveis</Text>
        <Text className="mt-2 text-sm text-slate-600">Selecione uma categoria para iniciar a busca de fornecedores na sua região.</Text>
      </Card>
    )
  }

  if (isSearching) {
    return (
      <Card className="bg-slate-50">
        <Text className="text-xs font-medium uppercase tracking-wide text-slate-500">Fornecedores elegíveis</Text>
        {categoryName ? (
          <View className="mt-2 self-start rounded-lg bg-brand/10 px-2.5 py-1">
            <Text className="text-xs font-medium text-brand">{categoryName}</Text>
          </View>
        ) : null}
        <Text className="mt-3 text-sm font-medium text-slate-800">Buscando fornecedores...</Text>
        <Text className="mt-1 text-xs text-slate-500">Mapeando parceiros compatíveis com a categoria e o endereço informado.</Text>
      </Card>
    )
  }

  if (!cidade) {
    return (
      <Card className="bg-slate-50">
        <Text className="text-xs font-medium uppercase tracking-wide text-slate-500">Fornecedores elegíveis</Text>
        {categoryName ? (
          <View className="mt-2 self-start rounded-lg bg-brand/10 px-2.5 py-1">
            <Text className="text-xs font-medium text-brand">{categoryName}</Text>
          </View>
        ) : null}
        <Text className="mt-3 text-sm font-medium text-slate-800">Quase lá</Text>
        <Text className="mt-1 text-xs text-slate-500">Informe o CEP e a cidade para refinar os fornecedores elegíveis na região.</Text>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-50">
      <Text className="text-xs font-medium uppercase tracking-wide text-slate-500">Fornecedores elegíveis</Text>
      {categoryName ? (
        <View className="mt-2 self-start rounded-lg bg-brand/10 px-2.5 py-1">
          <Text className="text-xs font-medium text-brand">{categoryName}</Text>
        </View>
      ) : null}

      <View className="mt-4 items-center rounded-xl border border-slate-200 bg-white px-4 py-5">
        <Text className="text-xs font-medium uppercase tracking-wide text-brand/80">Encontrados na região</Text>
        <Text className="mt-1 text-4xl font-bold text-brand">{eligible.count}</Text>
      </View>

      {(cidade || deliverySummary) ? (
        <View className="mt-3 flex-row items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
          <MapPin size={16} color="#2F66F3" />
          <View className="flex-1">
            {deliverySummary ? <Text className="text-sm font-medium text-slate-800">{deliverySummary}</Text> : null}
            <Text className="text-sm text-slate-600">
              {cidade}
              {uf ? `/${uf}` : ''}
            </Text>
          </View>
        </View>
      ) : null}

      <View className="mt-3 gap-2">
        {eligible.list.map((supplier) => (
          <View key={supplier} className="flex-row items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
            <View className="h-5 w-5 items-center justify-center rounded-full bg-green-100">
              <Check size={12} color="#16a34a" />
            </View>
            <Text className="flex-1 text-sm font-medium text-slate-800">{supplier}</Text>
          </View>
        ))}
      </View>

      {eligible.others > 0 ? (
        <Text className="mt-2 text-center text-xs text-slate-500">+ {eligible.others} outros na região</Text>
      ) : null}
    </Card>
  )
}
