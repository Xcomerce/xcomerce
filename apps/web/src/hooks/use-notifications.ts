import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import * as notifications from '@/services/notifications'
import type { Notification, NotificationPreferenceUpdate } from '@/services/notifications'

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (userId: string) => [...notificationKeys.all, 'list', userId] as const,
  unread: (userId: string) => [...notificationKeys.all, 'unread', userId] as const,
  preferences: (userId: string) => [...notificationKeys.all, 'preferences', userId] as const,
}

type NotificationRealtimeState = {
  userId: string | null
  channel: RealtimeChannel | null
  subscribers: number
  onChange: (() => void) | null
}

const notificationRealtime: NotificationRealtimeState = {
  userId: null,
  channel: null,
  subscribers: 0,
  onChange: null,
}

function subscribeNotificationRealtime(userId: string, onChange: () => void) {
  notificationRealtime.subscribers += 1
  notificationRealtime.onChange = onChange

  if (notificationRealtime.channel && notificationRealtime.userId === userId) {
    return
  }

  if (notificationRealtime.channel) {
    void supabase.removeChannel(notificationRealtime.channel)
    notificationRealtime.channel = null
  }

  notificationRealtime.userId = userId
  notificationRealtime.channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      () => {
        notificationRealtime.onChange?.()
      },
    )
    .subscribe()
}

function unsubscribeNotificationRealtime() {
  notificationRealtime.subscribers = Math.max(0, notificationRealtime.subscribers - 1)

  if (notificationRealtime.subscribers > 0) return

  if (notificationRealtime.channel) {
    void supabase.removeChannel(notificationRealtime.channel)
  }

  notificationRealtime.channel = null
  notificationRealtime.userId = null
  notificationRealtime.onChange = null
}

export function useNotificationRealtimeSync() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!user?.id) return

    subscribeNotificationRealtime(user.id, () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.unread(user.id) })
      queryClient.invalidateQueries({ queryKey: notificationKeys.list(user.id) })
    })

    return () => {
      unsubscribeNotificationRealtime()
    }
  }, [user?.id, queryClient])
}

export function useNotifications() {
  const { user } = useAuth()
  useNotificationRealtimeSync()

  return useQuery({
    queryKey: notificationKeys.list(user?.id ?? ''),
    queryFn: () => notifications.fetchNotifications(user!.id, { unreadOnly: true }),
    enabled: !!user?.id,
  })
}

export function useUnreadNotificationCount() {
  const { user } = useAuth()
  useNotificationRealtimeSync()

  return useQuery({
    queryKey: notificationKeys.unread(user?.id ?? ''),
    queryFn: () => notifications.fetchUnreadCount(user!.id),
    enabled: !!user?.id,
  })
}

export function useNotificationPreferences() {
  const { user } = useAuth()
  return useQuery({
    queryKey: notificationKeys.preferences(user?.id ?? ''),
    queryFn: () => notifications.fetchPreferences(user!.id),
    enabled: !!user?.id,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (notificationId: string) => notifications.markRead(notificationId),
    onMutate: async (notificationId) => {
      if (!user?.id) return
      const listKey = notificationKeys.list(user.id)
      await queryClient.cancelQueries({ queryKey: listKey })
      const previous = queryClient.getQueryData<Notification[]>(listKey)
      queryClient.setQueryData<Notification[]>(listKey, (current) =>
        current?.filter((notification) => notification.id !== notificationId) ?? [],
      )
      return { previous }
    },
    onError: (_error, _notificationId, context) => {
      if (user?.id && context?.previous) {
        queryClient.setQueryData(notificationKeys.list(user.id), context.previous)
      }
    },
    onSettled: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: notificationKeys.list(user.id) })
        queryClient.invalidateQueries({ queryKey: notificationKeys.unread(user.id) })
      }
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: () => notifications.markAllRead(user!.id),
    onMutate: async () => {
      if (!user?.id) return
      const listKey = notificationKeys.list(user.id)
      await queryClient.cancelQueries({ queryKey: listKey })
      const previous = queryClient.getQueryData<Notification[]>(listKey)
      queryClient.setQueryData<Notification[]>(listKey, [])
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (user?.id && context?.previous) {
        queryClient.setQueryData(notificationKeys.list(user.id), context.previous)
      }
    },
    onSettled: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: notificationKeys.list(user.id) })
        queryClient.invalidateQueries({ queryKey: notificationKeys.unread(user.id) })
      }
    },
  })
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (prefs: NotificationPreferenceUpdate[]) =>
      notifications.updatePreferences(user!.id, prefs),
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: notificationKeys.preferences(user.id) })
      }
    },
  })
}
