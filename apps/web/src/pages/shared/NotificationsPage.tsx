import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-notifications'

function getNotificationRoute(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const route = (data as { route?: unknown }).route
  return typeof route === 'string' && route.startsWith('/') ? route : null
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const { data: notifications = [], isLoading } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  async function handleOpen(notificationId: string, data: unknown) {
    await markRead.mutateAsync(notificationId)
    const route = getNotificationRoute(data)
    if (route) navigate(route)
  }

  return (
    <div className="w-full space-y-6">
      {notifications.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            variant="outline"
            className="rounded-xl font-semibold"
          >
            {markAllRead.isPending ? 'Marcando...' : 'Marcar tudo como lido'}
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {!isLoading && notifications.length === 0 && (
        <EmptyState
          icon={Bell}
          title="Sem notificações"
          description="Você está em dia. Novos alertas aparecerão aqui."
        />
      )}

      <div className="space-y-2">
        {notifications.map((n) => (
          <Card key={n.id} className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-start justify-between gap-4 py-4">
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => void handleOpen(n.id, n.data)}
              >
                <p className="font-medium">{n.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(n.created_at).toLocaleString('pt-BR')}
                  {(n.group_count ?? 1) > 1 ? ` · ${n.group_count} eventos agrupados` : ''}
                </p>
              </button>
              <Button
                size="sm"
                variant="secondary"
                disabled={markRead.isPending}
                onClick={() => markRead.mutate(n.id)}
              >
                Marcar lida
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
