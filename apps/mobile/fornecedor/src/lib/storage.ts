import { supabase } from '@/lib/supabase'

export async function uploadFileFromUri(
  bucket: string,
  path: string,
  uri: string,
  contentType: string,
): Promise<string> {
  const response = await fetch(uri)
  const blob = await response.blob()

  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    upsert: true,
    contentType,
  })
  if (error) throw error

  return path
}

export function avatarPath(userId: string, ext: string) {
  return `avatars/${userId}/avatar.${ext}`
}

export function documentPath(userId: string, fileName: string) {
  return `${userId}/${fileName}`
}

export function productImagePath(userId: string, productId: string, ext: string) {
  return `${userId}/${productId}.${ext}`
}

export async function getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
  if (error) throw error
  return data.signedUrl
}
