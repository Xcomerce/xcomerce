export const USER_ROLES = ['buyer', 'supplier', 'commercial', 'admin'] as const

export type UserRole = (typeof USER_ROLES)[number]

export type SupplierStatus = 'pendente' | 'em_revisao' | 'aprovado' | 'recusado'
