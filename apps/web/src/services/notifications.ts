import { supabase } from '@/lib/supabase'
import type { Tables } from '@keve/shared'

export type Notification = Tables<'notifications'>

export type NotificationPreference = {
  user_id: string
  notification_type: string
  email_enabled: boolean
  push_enabled: boolean
  in_app_enabled: boolean
  updated_at: string
}

export type NotificationPreferenceUpdate = {
  notification_type: string
  email_enabled?: boolean
  push_enabled?: boolean
  in_app_enabled?: boolean
}

export async function fetchNotifications(userId: string, limit = 50): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as Notification[]
}

export async function markRead(notificationId: string): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .is('read_at', null)
    .select()
    .single()

  if (error) throw error
  return data as Notification
}

export async function fetchUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)

  if (error) throw error
  return count ?? 0
}

export async function fetchPreferences(userId: string): Promise<NotificationPreference[]> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .order('notification_type', { ascending: true })

  if (error) throw error
  return (data ?? []) as NotificationPreference[]
}

export async function updatePreferences(
  userId: string,
  preferences: NotificationPreferenceUpdate[],
): Promise<NotificationPreference[]> {
  const rows = preferences.map((pref) => ({
    user_id: userId,
    notification_type: pref.notification_type,
    email_enabled: pref.email_enabled ?? true,
    push_enabled: pref.push_enabled ?? true,
    in_app_enabled: pref.in_app_enabled ?? true,
  }))

  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert(rows, { onConflict: 'user_id,notification_type' })
    .select()

  if (error) throw error
  return (data ?? []) as NotificationPreference[]
}
