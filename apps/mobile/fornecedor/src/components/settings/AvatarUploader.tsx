import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Image, Pressable, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Camera } from 'lucide-react-native'
import { useAuth } from '@/contexts/auth-context'
import { useUpdateProfile } from '@/hooks/use-profile'
import { avatarPath, getSignedUrl, uploadFileFromUri } from '@/lib/storage'
import { formatSupabaseError } from '@/lib/errors'
import { getInitials } from '@/lib/utils'
import type { UserProfile } from '@/services/profile'

type AvatarUploaderProps = {
  profile: UserProfile
}

export function AvatarUploader({ profile }: AvatarUploaderProps) {
  const { user, refreshProfile } = useAuth()
  const updateProfile = useUpdateProfile()
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!profile.avatar_url) {
      setAvatarPreview(null)
      return
    }

    let cancelled = false
    getSignedUrl('documents', profile.avatar_url)
      .then((url) => {
        if (!cancelled) setAvatarPreview(url)
      })
      .catch(() => {
        if (!cancelled) setAvatarPreview(null)
      })

    return () => {
      cancelled = true
    }
  }, [profile.avatar_url])

  const handlePick = async () => {
    if (!user) return

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permissão', 'Permita o acesso à galeria para alterar a foto.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    })

    if (result.canceled || !result.assets[0]) return

    const asset = result.assets[0]
    const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg'
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      Alert.alert('Formato inválido', 'Use JPG, PNG ou WebP.')
      return
    }

    setUploading(true)
    try {
      const path = avatarPath(user.id, ext === 'jpeg' ? 'jpg' : ext)
      const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
      await uploadFileFromUri('documents', path, asset.uri, contentType)
      await updateProfile.mutateAsync({ avatar_url: path })
      await refreshProfile()
      const signed = await getSignedUrl('documents', path)
      setAvatarPreview(signed)
      Alert.alert('Sucesso', 'Avatar atualizado.')
    } catch (err) {
      Alert.alert('Erro', formatSupabaseError(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <View className="items-center py-4">
      <View className="relative">
        <View className="h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100">
          {avatarPreview ? (
            <Image source={{ uri: avatarPreview }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <Text className="text-3xl font-bold text-slate-600">{getInitials(profile.full_name)}</Text>
          )}
        </View>
        <Pressable
          onPress={handlePick}
          disabled={uploading}
          className="absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md"
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#2F66F3" />
          ) : (
            <Camera size={16} color="#2F66F3" />
          )}
        </Pressable>
      </View>
    </View>
  )
}
