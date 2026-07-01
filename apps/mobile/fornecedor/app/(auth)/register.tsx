import { useState } from 'react'
import { Link, useRouter } from 'expo-router'
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Switch, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/auth-context'
import { formatSupabaseError } from '@/lib/errors'

export default function RegisterScreen() {
  const router = useRouter()
  const { signUp } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    if (!acceptTerms) {
      Alert.alert('Termos', 'Você deve aceitar os termos para continuar.')
      return
    }
    if (password !== confirmPassword) {
      Alert.alert('Senha', 'As senhas não coincidem.')
      return
    }
    setLoading(true)
    try {
      await signUp({ fullName, email: email.trim(), phone, password, confirmPassword, acceptTerms: true })
      Alert.alert('Sucesso', 'Conta de fornecedor criada! Faça login para continuar.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ])
    } catch (err) {
      Alert.alert('Erro', formatSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerClassName="px-6 py-8" keyboardShouldPersistTaps="handled">
          <Text className="text-2xl font-bold text-brand-dark">Cadastro fornecedor</Text>
          <View className="mt-6 gap-4">
            <Input label="Nome completo" value={fullName} onChangeText={setFullName} />
            <Input label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <Input label="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Input label="Senha" value={password} onChangeText={setPassword} secureTextEntry />
            <Input label="Confirmar senha" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
            <View className="flex-row items-center gap-3">
              <Switch value={acceptTerms} onValueChange={setAcceptTerms} />
              <Text className="flex-1 text-sm text-slate-600">
                Aceito os termos de uso e política de privacidade (LGPD)
              </Text>
            </View>
            <Button label="Criar conta" onPress={handleRegister} loading={loading} />
          </View>
          <Link href="/(auth)/login" asChild>
            <Text className="mt-4 text-center text-sm text-brand">Já tenho conta</Text>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
