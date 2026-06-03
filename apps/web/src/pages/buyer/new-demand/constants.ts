export const ATTACHMENT_ACCEPT =
  'application/pdf,image/jpeg,image/png,image/webp,.doc,.docx,.xls,.xlsx'

export const MAX_ATTACHMENTS = 10

export const NATIVE_FIELD_CLASS =
  'flex w-full rounded-xl border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export const BRAZILIAN_UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

/** Preenche o main do AppShell (já descontado o header) */
export const DEMAND_PAGE_HEIGHT_CLASS = 'h-full max-h-full min-h-0'
