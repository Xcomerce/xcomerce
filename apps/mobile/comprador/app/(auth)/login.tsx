import { useState } from 'react'
import { Link, useRouter } from 'expo-router'
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BrandMark } from '@/components/brand/BrandMark'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/auth-context'
import { formatSupabaseError } from '@/lib/errors'
import { isSupabaseConfigured } from '@/lib/supabase'

export default function LoginScreen() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!isSupabaseConfigured) {
      Alert.alert('Configuração', 'Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no .env')
      return
    }
    setLoading(true)
    try {
      await signIn(email.trim(), password)
      router.replace('/(app)')
    } catch (err) {
      Alert.alert('Erro', formatSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-8" keyboardShouldPersistTaps="handled">
          <BrandMark size="md" className="mb-2" />
          <Text className="mt-2 text-base text-slate-500">Entre na sua conta de comprador</Text>

          <View className="mt-8 gap-4">
            <Input label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <Input label="Senha" value={password} onChangeText={setPassword} secureTextEntry />
            <Button label="Entrar" onPress={handleLogin} loading={loading} />
          </View>

          <Link href="/(auth)/forgot-password" asChild>
            <Text className="mt-4 text-center text-sm text-brand">Esqueci minha senha</Text>
          </Link>
          <Link href="/(auth)/register" asChild>
            <Text className="mt-2 text-center text-sm text-slate-600">
              Não tem conta? <Text className="font-semibold text-brand">Cadastre-se</Text>
            </Text>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
