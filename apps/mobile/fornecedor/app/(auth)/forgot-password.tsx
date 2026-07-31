import { useState } from 'react'
import { Link } from 'expo-router'
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/auth-context'
import { formatSupabaseError } from '@/lib/errors'

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleReset = async () => {
    setLoading(true)
    try {
      await resetPassword(email.trim())
      Alert.alert('Enviado', 'Se o e-mail existir, você receberá instruções para redefinir a senha.')
    } catch (err) {
      Alert.alert('Erro', formatSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-8">
          <Text className="text-2xl font-bold text-brand-dark">Recuperar senha</Text>
          <Text className="mt-2 text-slate-500">Informe seu e-mail cadastrado</Text>
          <Input containerClassName="mt-6" label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Button label="Enviar link" onPress={handleReset} loading={loading} className="mt-4" />
          <Link href="/(auth)/login" asChild>
            <Text className="mt-4 text-center text-sm text-brand">Voltar ao login</Text>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
