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
