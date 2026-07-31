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

export const BUYER_NOTIFICATIONS = [
  {
    type: 'offer.received',
    label: 'Nova proposta recebida',
    description: 'Quando um fornecedor envia proposta em uma demanda sua.',
  },
  {
    type: 'chat.message',
    label: 'Mensagens de negociação',
    description: 'Novas mensagens no chat com fornecedores.',
  },
  {
    type: 'order.status_changed',
    label: 'Atualização de pedido',
    description: 'Mudanças de status nos seus pedidos.',
  },
  {
    type: 'sla.reminder',
    label: 'Lembrete de prazo',
    description: 'Quando uma ação sua está próxima do prazo limite.',
  },
  {
    type: 'sla.expired',
    label: 'Prazo expirado',
    description: 'Quando um prazo importante foi ultrapassado.',
  },
  {
    type: 'subscription.past_due',
    label: 'Pagamento em atraso',
    description: 'Quando há pendência no pagamento do seu plano.',
  },
  {
    type: 'subscription.activated',
    label: 'Plano ativado',
    description: 'Confirmação de ativação ou renovação do seu plano.',
  },
] as const

export type NotificationPreferenceItem = {
  type: string
  label: string
  description: string
}

export const buyerNotificationItems: NotificationPreferenceItem[] = BUYER_NOTIFICATIONS.map(
  (item) => ({ ...item }),
)

export function getSettingsMenuItems(): typeof SETTINGS_MENU_ITEMS {
  return SETTINGS_MENU_ITEMS.filter((item) => item.id !== 'notifications')
}

export function getSectionMeta(section: SettingsSection) {
  return SETTINGS_MENU_ITEMS.find((item) => item.id === section)
}
