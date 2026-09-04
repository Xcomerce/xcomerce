import { supabase } from '@/lib/supabase'
import {
  buildUploadFailureKey,
  trackDiagnosticEvent,
} from '@/lib/diagnostics'

export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
  if (error) {
    void trackDiagnosticEvent(
      'upload_failure',
      buildUploadFailureKey(bucket, error.name ?? error.message ?? 'unknown'),
      {
        bucket,
        code: error.name,
        message: error.message,
        path: path.split('/').slice(0, 2).join('/'),
      },
      { dedupeMs: 10_000 },
    )
    throw error
  }

  if (bucket === 'product-images') {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  return path
}

export function avatarPath(userId: string, ext: string) {
  return `avatars/${userId}/avatar.${ext}`
}

export function documentPath(userId: string, fileName: string) {
  return `${userId}/${fileName}`
}

export function productImagePath(userId: string, productId: string, ext: string, uniqueSuffix?: string) {
  const suffix = uniqueSuffix ? `-${uniqueSuffix}` : ''
  return `${userId}/${productId}${suffix}.${ext}`
}

export function chatAttachmentPath(userId: string, fileName: string) {
  return `${userId}/${Date.now()}-${fileName}`
}

export function orderAttachmentPath(userId: string, orderId: string, fileName: string) {
  return `${userId}/${orderId}/${Date.now()}-${fileName}`
}

export async function getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
  if (error) throw error
  return data.signedUrl
}
