import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BackButton } from '@/components/common/back-button'
import { AppHeader } from '@/components/layout/AppHeader'
import { Card } from '@/components/ui/Card'
import { buildMailtoUrl, buildWhatsAppUrl, formatWhatsAppDisplay, formatSupportHours } from '@keve/shared'
import { useSupportContactSettings } from '@/hooks/use-support-settings'

export default function SupportScreen() {
  const { data: settings, isLoading } = useSupportContactSettings()
  const email = settings?.email ?? null
  const whatsapp = settings?.whatsapp ?? null
  const mailto = buildMailtoUrl(email)
  const whatsappUrl = buildWhatsAppUrl(whatsapp)
  const horario = formatSupportHours(settings?.horario)

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <AppHeader title="Suporte" />
      <ScrollView contentContainerClassName="p-4 gap-4">
        <BackButton fallbackHref="/(app)/profile" />
        <Card>
          <Text className="text-lg font-bold text-brand-dark">Central de ajuda</Text>
          <Text className="mt-2 text-slate-600">
            Precisa de ajuda com pedidos e propostas? Entre em contato com nossa equipe.
          </Text>

          {isLoading ? (
            <ActivityIndicator className="mt-4" />
          ) : (
            <>
              {email && mailto ? (
                <View className="mt-4">
                  <Text className="font-semibold text-slate-800">E-mail</Text>
                  <Pressable onPress={() => void Linking.openURL(mailto)}>
                    <Text className="text-brand">{email}</Text>
                  </Pressable>
                </View>
              ) : null}

              {whatsapp && whatsappUrl ? (
                <View className="mt-4">
                  <Text className="font-semibold text-slate-800">WhatsApp</Text>
                  <Pressable onPress={() => void Linking.openURL(whatsappUrl)}>
                    <Text className="text-brand">{formatWhatsAppDisplay(whatsapp)}</Text>
                  </Pressable>
                </View>
              ) : null}

              {!email && !whatsapp ? (
                <Text className="mt-4 text-sm text-slate-500">
                  Os contatos de suporte ainda não foram configurados.
                </Text>
              ) : null}

              {horario ? (
                <>
                  <Text className="mt-4 font-semibold text-slate-800">Horário</Text>
                  <Text className="text-slate-600">{horario}</Text>
                </>
              ) : null}
            </>
          )}
        </Card>
        <Card>
          <Text className="font-semibold text-slate-800">Perguntas frequentes</Text>
          <Text className="mt-2 text-sm text-slate-600">
            • Como publicar um pedido? Use o botão + na barra inferior.{'\n'}
            • Como aceitar uma proposta? Abra o pedido e toque em Aceitar.{'\n'}
            • O pagamento é pela plataforma? Não — negociação externa após aceite.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}
