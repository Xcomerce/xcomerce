export const ATTACHMENT_ACCEPT =
  'application/pdf,image/jpeg,image/png,image/webp,.doc,.docx,.xls,.xlsx'

export const MAX_ATTACHMENTS = 10

/** Campos touch-friendly: 44px+ (iOS/Android) e text-base evita zoom no iOS */
export const MOBILE_TOUCH_FIELD_CLASS =
  'min-h-11 text-base md:min-h-10 md:text-sm scroll-mt-28 scroll-mb-40'

export const NATIVE_FIELD_CLASS =
  'flex w-full rounded-xl border border-border bg-background px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
  MOBILE_TOUCH_FIELD_CLASS

export const MOBILE_TOUCH_BUTTON_CLASS = 'min-h-11 text-sm md:min-h-10'

export { BRAZILIAN_UFS } from '@/config/brazil'

/** Preenche o main do AppShell (já descontado o header) */
export const DEMAND_PAGE_HEIGHT_CLASS = 'h-full max-h-full min-h-0'
