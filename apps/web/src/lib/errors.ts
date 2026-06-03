const MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
  'User already registered': 'Este e-mail já está cadastrado.',
  'Password should be at least 6 characters': 'A senha deve ter no mínimo 6 caracteres.',
  'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos.',
  'For security purposes, you can only request this once every 60 seconds':
    'Por segurança, aguarde 60 segundos antes de tentar novamente.',
  'New password should be different from the old password': 'A nova senha deve ser diferente da anterior.',
  'JWT expired': 'Sessão expirada. Faça login novamente.',
}

export function translateSupabaseError(message: string): string {
  for (const [key, pt] of Object.entries(MESSAGES)) {
    if (message.includes(key)) return pt
  }
  if (message.includes('quota') || message.includes('QUOTA')) {
    return 'Limite do plano atingido. Faça upgrade para continuar.'
  }
  if (message.includes('CONTACT_INFO_BLOCKED')) {
    return 'Não é permitido compartilhar dados de contato antes da revelação.'
  }
  return message
}
