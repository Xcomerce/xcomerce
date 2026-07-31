import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BackButton } from '@/components/common/back-button'
import { AppHeader } from '@/components/layout/AppHeader'
import { Card } from '@/components/ui/Card'

export default function SupportScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <AppHeader title="Suporte" />
      <ScrollView contentContainerClassName="p-4 gap-4">
        <BackButton fallbackHref="/(app)/profile" />
        <Card>
          <Text className="text-lg font-bold text-brand-dark">Central de ajuda</Text>
          <Text className="mt-2 text-slate-600">
            Precisa de ajuda com demandas, propostas ou pedidos? Entre em contato com nossa equipe.
          </Text>
          <Text className="mt-4 font-semibold text-slate-800">E-mail</Text>
          <Text className="text-brand">suporte@xcommerce.com.br</Text>
          <Text className="mt-4 font-semibold text-slate-800">Horário</Text>
          <Text className="text-slate-600">Seg–Sex, 9h às 18h (BRT)</Text>
        </Card>
        <Card>
          <Text className="font-semibold text-slate-800">Perguntas frequentes</Text>
          <Text className="mt-2 text-sm text-slate-600">
            • Como publicar uma demanda? Use o botão + na barra inferior.{'\n'}
            • Como aceitar uma proposta? Abra a demanda e toque em Aceitar.{'\n'}
            • O pagamento é pela plataforma? Não — negociação externa após aceite.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}
