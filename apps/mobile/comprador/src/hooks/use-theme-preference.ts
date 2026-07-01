import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useState } from 'react'
import { Appearance, Platform } from 'react-native'

const THEME_STORAGE_KEY = 'keve.theme'

export type ThemePreference = 'light' | 'dark'

export function useThemePreference() {
  const [theme, setThemeState] = useState<ThemePreference>('light')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return
        const next = stored === 'dark' ? 'dark' : 'light'
        setThemeState(next)
        if (Platform.OS !== 'web') {
          Appearance.setColorScheme(next)
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const setTheme = useCallback(async (next: ThemePreference) => {
    setThemeState(next)
    await AsyncStorage.setItem(THEME_STORAGE_KEY, next)
    if (Platform.OS !== 'web') {
      Appearance.setColorScheme(next)
    }
  }, [])

  return { theme, setTheme, ready }
}
