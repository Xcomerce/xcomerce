import type { LucideIcon } from 'lucide-react-native'
import {
  Bell,
  FileLock,
  FileText,
  MonitorSmartphone,
  Palette,
  Plug,
  Shield,
  User,
} from 'lucide-react-native'
import type { UserRole } from '@keve/shared'
import {
  BUYER_NOTIFICATION_PREFERENCES,
  type NotificationPreferenceDefinition,
} from '@keve/shared'

export type SettingsSection =
  | 'account'
  | 'security'
  | 'sessions'
  | 'notifications'
  | 'appearance'
  | 'integrations'
  | 'privacy'
  | 'terms'

export const ROLE_LABELS: Record<UserRole, string> = {
  buyer: 'Comprador',
  supplier: 'Fornecedor',
  admin: 'Administrador',
  commercial: 'Comercial',
}

export const SETTINGS_MENU_ITEMS: {
  id: SettingsSection
  label: string
  description: string
  icon: LucideIcon
}[] = [
  {
    id: 'account',
    label: 'Minha conta',
    description: 'Perfil, contato, e-mail e data de cadastro.',
    icon: User,
  },
  {
    id: 'security',
    label: 'Segurança do acesso',
    description: 'Altere sua senha de login da plataforma.',
    icon: Shield,
  },
  {
    id: 'sessions',
    label: 'Sessões ativas',
    description: 'Dispositivos conectados e encerramento de sessões.',
    icon: MonitorSmartphone,
  },
  {
    id: 'notifications',
    label: 'Notificações',
    description: 'Propostas, pedidos, mensagens e plano da sua conta.',
    icon: Bell,
  },
  {
    id: 'appearance',
    label: 'Aparência',
    description: 'Escolha entre modo claro ou escuro.',
    icon: Palette,
  },
  {
    id: 'integrations',
    label: 'Integrações',
    description: 'Conecte ferramentas externas à plataforma.',
    icon: Plug,
  },
  {
    id: 'privacy',
    label: 'Privacidade / dados (LGPD)',
    description: 'Exportação, exclusão e política de privacidade.',
    icon: FileLock,
  },
  {
    id: 'terms',
    label: 'Termos de Uso',
    description: 'Regras e condições de utilização da plataforma.',
    icon: FileText,
  },
]

export type NotificationPreferenceItem = NotificationPreferenceDefinition

export const buyerNotificationItems: NotificationPreferenceItem[] =
  BUYER_NOTIFICATION_PREFERENCES.map((item) => ({ ...item }))

export function getSettingsMenuItems(): typeof SETTINGS_MENU_ITEMS {
  return SETTINGS_MENU_ITEMS.filter((item) => item.id !== 'privacy' || true).map((item) => {
    if (item.id === 'notifications') {
      return {
        ...item,
        description: 'Propostas, pedidos, mensagens e plano da sua conta.',
      }
    }
    return item
  })
}

export function getSectionMeta(section: SettingsSection) {
  return SETTINGS_MENU_ITEMS.find((item) => item.id === section)
}
