import { Platform } from 'react-native'
import Constants from 'expo-constants'

const WEB_ASSETS_BASE =
  process.env.EXPO_PUBLIC_WEB_ASSETS_URL ??
  (Constants.expoConfig?.extra?.webAssetsUrl as string | undefined) ??
  'http://localhost:5173'

function normalizeBase(url: string) {
  return url.replace(/\/$/, '')
}

/** Ícone da marca (mesmo arquivo da web: /logo-icon-dark.svg). */
export function getBrandLogoIconUri(variant: 'dark' | 'light' = 'dark'): string {
  const file = variant === 'light' ? 'logo-icon-light.svg' : 'logo-icon-dark.svg'

  if (Platform.OS === 'web') {
    return `/${file}`
  }

  return `${normalizeBase(WEB_ASSETS_BASE)}/${file}`
}
