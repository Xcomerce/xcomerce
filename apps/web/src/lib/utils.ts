import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function translateAuthError(message: string): string {
  const map: Record<string, string> = {
    'Invalid login credentials': 'E-mail ou senha incorretos',
    'User already registered': 'Este e-mail já está cadastrado',
    'Password should be at least 6 characters': 'Senha deve ter no mínimo 6 caracteres',
    'Email not confirmed': 'Confirme seu e-mail antes de entrar',
  }
  return map[message] ?? message
}

export function formatRelativeDate(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()

  if (isToday) {
    return `hoje às ${timeStr}`
  }
  if (isYesterday) {
    return `ontem às ${timeStr}`
  }
  if (diffDays < 7) {
    return `há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `há ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return `há ${months} ${months === 1 ? 'mês' : 'meses'}`
  }
  const years = Math.floor(diffDays / 365)
  return `há ${years} ${years === 1 ? 'ano' : 'anos'}`
}

export function formatReceivedAt(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  const now = new Date()
  const diffMs = Math.max(0, now.getTime() - date.getTime())
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffMins < 1) {
    return 'agora'
  }
  if (diffMins < 60) {
    return `há ${diffMins} min`
  }

  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  if (isToday) {
    return `hoje às ${timeStr}`
  }

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()

  if (isYesterday) {
    return `ontem às ${timeStr}`
  }

  return formatRelativeDate(date)
}

export type ExpiresAtLabel = {
  label: string
  isExpired: boolean
  isUrgent: boolean
}

export function formatExpiresAt(dateInput: string | Date | null | undefined): ExpiresAtLabel | null {
  if (!dateInput) return null

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()

  if (diffMs <= 0) {
    return { label: 'Expirada', isExpired: true, isUrgent: false }
  }

  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  const isSameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const isTomorrow =
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear()

  if (isSameDay) {
    if (diffHours <= 1) {
      return { label: 'Expira em breve', isExpired: false, isUrgent: true }
    }
    return { label: 'Expira hoje', isExpired: false, isUrgent: true }
  }
  if (isTomorrow) {
    return { label: 'Expira amanhã', isExpired: false, isUrgent: true }
  }
  if (diffDays < 7) {
    return {
      label: `Expira em ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`,
      isExpired: false,
      isUrgent: diffDays <= 3,
    }
  }
  if (diffDays < 30) {
    const weeks = Math.ceil(diffDays / 7)
    return {
      label: `Expira em ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`,
      isExpired: false,
      isUrgent: false,
    }
  }
  if (diffDays < 365) {
    const months = Math.ceil(diffDays / 30)
    return {
      label: `Expira em ${months} ${months === 1 ? 'mês' : 'meses'}`,
      isExpired: false,
      isUrgent: false,
    }
  }
  const years = Math.ceil(diffDays / 365)
  return {
    label: `Expira em ${years} ${years === 1 ? 'ano' : 'anos'}`,
    isExpired: false,
    isUrgent: false,
  }
}
