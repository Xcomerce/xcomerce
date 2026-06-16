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

export function formatSupabaseError(error: unknown): string {
  if (error instanceof Error) {
    return translateSupabaseError(error.message)
  }
  if (error && typeof error === 'object') {
    const e = error as { message?: string; details?: string; hint?: string; code?: string }
    const parts = [e.message, e.details, e.hint, e.code ? `(${e.code})` : ''].filter(Boolean)
    if (parts.length > 0) return translateSupabaseError(parts.join(' — '))
  }
  return 'Erro ao comunicar com o Supabase.'
}

export function isQuotaExceededError(error: unknown): boolean {
  if (error instanceof Error) {
    if (/QUOTA_EXCEEDED|QUOTA|limite mensal/i.test(error.message)) return true
  }
  if (error && typeof error === 'object') {
    const e = error as { message?: string; details?: string; hint?: string }
    const raw = [e.message, e.details, e.hint].filter(Boolean).join(' ')
    if (/QUOTA_EXCEEDED|QUOTA|limite mensal/i.test(raw)) return true
  }
  return false
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
  if (message.includes('OFFER_PRICE_BELOW_MARKET_MARGIN')) {
    return 'Proposta abaixo do limite viável (máx. 20% abaixo do preço de mercado).'
  }
  if (message.includes('supplier_auto_offer_discount_range')) {
    return 'Desconto da auto-proposta deve estar entre 0% e 20%.'
  }
  if (message.includes('supplier_auto_offer_max_gte_min')) {
    return 'Quantidade máxima da demanda deve ser maior ou igual à mínima.'
  }
  if (message.includes('PGRST116') || message.includes('0 rows')) {
    return 'Nenhum registro encontrado para esta ação. Atualize a página e tente novamente.'
  }
  if (message.includes('Complete o onboarding')) {
    return message
  }
  if (message.includes('já foi aprovado') || message.includes('já está em revisão')) {
    return message
  }
  if (
    message.includes('does not exist') ||
    (message.includes('relation') && message.includes('demands'))
  ) {
    return 'Tabela ou schema ausente no Supabase. Rode as migrations no projeto do .env.local (supabase link + db push).'
  }
  if (message.includes('infinite recursion') || message.includes('500')) {
    return 'Erro no banco (500). Confira se as migrations foram aplicadas no projeto configurado em .env.local.'
  }
  return message
}
