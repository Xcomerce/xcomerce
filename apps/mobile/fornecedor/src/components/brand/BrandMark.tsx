import { Platform, Text, View } from 'react-native'
import { SvgUri } from 'react-native-svg'
import { getBrandLogoIconUri } from '@/lib/brand-assets'
import { cn } from '@/lib/utils'

type BrandMarkProps = {
  size?: 'sm' | 'md'
  showWordmark?: boolean
  className?: string
}

const ICON_HEIGHT = { sm: 20, md: 24 } as const
const WORDMARK_CLASS = { sm: 'text-base', md: 'text-lg' } as const

export function BrandMark({ size = 'md', showWordmark = true, className }: BrandMarkProps) {
  const iconHeight = ICON_HEIGHT[size]
  const logoUri = getBrandLogoIconUri('dark')

  return (
    <View className={cn('flex-row items-center gap-2', className)}>
      {Platform.OS === 'web' ? (
        // eslint-disable-next-line jsx-a11y/alt-text
        <img
          src={logoUri}
          style={{ height: iconHeight, width: 'auto', objectFit: 'contain' }}
        />
      ) : (
        <SvgUri uri={logoUri} width={iconHeight * 2} height={iconHeight} />
      )}
      {showWordmark ? (
        <Text
          className={cn(
            'font-medium tracking-widest text-brand-dark',
            WORDMARK_CLASS[size],
          )}
        >
          XCOMERCE
        </Text>
      ) : null}
    </View>
  )
}
