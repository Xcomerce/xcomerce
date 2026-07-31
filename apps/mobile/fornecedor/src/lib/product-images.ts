import { Platform } from 'react-native'
import Constants from 'expo-constants'

const WEB_ASSETS_BASE =
  process.env.EXPO_PUBLIC_WEB_ASSETS_URL ??
  (Constants.expoConfig?.extra?.webAssetsUrl as string | undefined) ??
  'http://localhost:5173'

function getProductImagePath(nome: string): string | null {
  const nameLower = nome.toLowerCase()
  if (nameLower.includes('cimento')) return '/products/cimento.png'
  if (nameLower.includes('tijolo')) return '/products/tijolo.png'
  if (nameLower.includes('brita')) return '/products/brita.png'
  if (nameLower.includes('tinta') || nameLower.includes('esmalte')) return '/products/tinta.png'
  if (
    nameLower.includes('notebook') ||
    nameLower.includes('computador') ||
    nameLower.includes('switch') ||
    nameLower.includes('impressora')
  ) {
    return '/products/notebook.png'
  }
  if (nameLower.includes('arroz') || nameLower.includes('feijão') || nameLower.includes('feijao') || nameLower.includes('azeite')) {
    return '/products/arroz.png'
  }
  if (nameLower.includes('água') || nameLower.includes('agua')) return '/products/agua.png'
  if (nameLower.includes('epi') || nameLower.includes('capacete') || nameLower.includes('uniforme')) {
    return '/products/epi.png'
  }
  if (
    nameLower.includes('caixa') ||
    nameLower.includes('embalagem') ||
    nameLower.includes('filme stretch') ||
    nameLower.includes('saco')
  ) {
    return '/products/caixa.png'
  }
  return null
}

export function getProductImageUri(nome: string, dbUrl: string | null | undefined): string | null {
  if (dbUrl) return dbUrl
  const path = getProductImagePath(nome)
  if (!path) return null
  if (Platform.OS === 'web') {
    return `${WEB_ASSETS_BASE}${path}`
  }
  return `${WEB_ASSETS_BASE}${path}`
}
