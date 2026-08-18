import { useEffect, useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { ChevronDown, Search } from 'lucide-react-native'
import { BRAZILIAN_UFS } from '@/lib/brazilian-ufs'
import { useSearchSuggestions } from '@/hooks/use-products'
import type { SearchSuggestion } from '@keve/shared'

const SUGGESTION_LABELS: Record<SearchSuggestion['suggestionType'], string> = {
  produto: 'Produto',
  marca: 'Marca',
  categoria: 'Categoria',
  cor: 'Cor',
}

type Props = {
  search: string
  onSearchChange: (value: string) => void
  selectedUf: string
  onUfChange: (value: string) => void
}

export function FeedSearchBar({ search, onSearchChange, selectedUf, onUfChange }: Props) {
  const [ufOpen, setUfOpen] = useState(false)
  const [inputValue, setInputValue] = useState(search)
  const [debouncedQuery, setDebouncedQuery] = useState(search)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    setInputValue(search)
    setDebouncedQuery(search)
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(inputValue)
      onSearchChange(inputValue.trim())
    }, 300)

    return () => clearTimeout(timer)
  }, [inputValue, onSearchChange])

  const { data: suggestions = [] } = useSearchSuggestions(debouncedQuery, focused)
  const visibleSuggestions = useMemo(
    () => (focused && debouncedQuery.trim().length >= 1 ? suggestions : []),
    [focused, debouncedQuery, suggestions],
  )

  return (
    <>
      <View className="relative">
        <View className="h-11 flex-row items-center rounded-xl border border-slate-200 bg-white px-3">
          <Search size={18} color="#64748b" />
          <TextInput
            className="ml-2 flex-1 py-2 text-sm text-slate-800"
            placeholder="Buscar produto, categoria ou fornecedor"
            placeholderTextColor="#94a3b8"
            value={inputValue}
            onChangeText={setInputValue}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
          />
          <View className="mx-2 h-5 w-px bg-slate-200" />
          <Pressable
            onPress={() => setUfOpen(true)}
            className="flex-row items-center gap-1 py-2 pl-1 pr-1"
          >
            <Text className={`text-sm font-medium ${selectedUf ? 'text-brand' : 'text-slate-500'}`}>
              {selectedUf || 'UF'}
            </Text>
            <ChevronDown size={14} color="#64748b" />
          </Pressable>
        </View>

        {visibleSuggestions.length > 0 ? (
          <View className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            {visibleSuggestions.map((item) => (
              <Pressable
                key={`${item.suggestionType}-${item.suggestion}`}
                onPress={() => {
                  setInputValue(item.suggestion)
                  onSearchChange(item.suggestion)
                  setFocused(false)
                }}
                className="flex-row items-center justify-between border-b border-slate-100 px-3 py-2.5"
              >
                <Text className="flex-1 text-sm text-slate-800">{item.suggestion}</Text>
                <Text className="text-xs text-slate-400">{SUGGESTION_LABELS[item.suggestionType]}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <Modal visible={ufOpen} transparent animationType="fade" onRequestClose={() => setUfOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setUfOpen(false)}>
          <Pressable className="max-h-[70%] rounded-t-2xl bg-white" onPress={(e) => e.stopPropagation()}>
            <View className="border-b border-slate-200 px-4 py-4">
              <Text className="text-lg font-bold text-brand-dark">Filtrar por UF</Text>
              <Text className="mt-1 text-sm text-slate-500">Selecione o estado para refinar os produtos do feed.</Text>
            </View>
            <ScrollView className="max-h-80">
              <Pressable
                onPress={() => {
                  onUfChange('')
                  setUfOpen(false)
                }}
                className={`border-b border-slate-100 px-4 py-3 ${!selectedUf ? 'bg-brand/5' : ''}`}
              >
                <Text className={`text-sm ${!selectedUf ? 'font-semibold text-brand' : 'text-slate-700'}`}>
                  Todas as UFs
                </Text>
              </Pressable>
              {BRAZILIAN_UFS.map((uf) => (
                <Pressable
                  key={uf}
                  onPress={() => {
                    onUfChange(uf)
                    setUfOpen(false)
                  }}
                  className={`border-b border-slate-100 px-4 py-3 ${selectedUf === uf ? 'bg-brand/5' : ''}`}
                >
                  <Text className={`text-sm ${selectedUf === uf ? 'font-semibold text-brand' : 'text-slate-700'}`}>
                    {uf}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}
