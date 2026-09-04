import { normalizeVariantValue } from '@keve/shared'
import { supabase } from '@/lib/supabase'

export type DiagnosticEventType =
  | 'search_no_result'
  | 'category_not_found'
  | 'variant_value_new'
  | 'demand_no_match'
  | 'demand_expired_no_offer'
  | 'product_form_abandoned'
  | 'server_error_500'
  | 'upload_failure'
  | 'request_timeout'
  | 'client_js_error'

export type DiagnosticUserRole = 'buyer' | 'supplier'

type TrackOptions = {
  userRole?: DiagnosticUserRole
  dedupeKey?: string
  dedupeMs?: number
}

const sessionDedupe = new Map<string, number>()
const DEFAULT_DEDUPE_MS = 60_000

function normalizeKeyPart(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function hashMessage(message: string): string {
  let hash = 0
  for (let i = 0; i < message.length; i++) {
    hash = (hash << 5) - hash + message.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

export function buildDiagnosticGroupKey(
  eventType: DiagnosticEventType,
  parts: string[],
): string {
  const normalized = parts.map(normalizeKeyPart).filter(Boolean)
  return `${eventType}:${normalized.join(':')}`.slice(0, 500)
}

export function buildSearchNoResultKey(query: string): string {
  return buildDiagnosticGroupKey('search_no_result', [query])
}

export function buildCategoryNotFoundKey(query: string): string {
  return buildDiagnosticGroupKey('category_not_found', [query])
}

export function buildVariantNewKey(categoryId: string, axisName: string, value: string): string {
  return buildDiagnosticGroupKey('variant_value_new', [
    categoryId,
    axisName,
    normalizeVariantValue(value),
  ])
}

export function buildDemandNoMatchKey(demandId: string): string {
  return `demand_no_match:${demandId}`
}

export function buildProductAbandonedKey(step: number): string {
  return `product_form_abandoned:step_${step}`
}

export function buildServerErrorKey(route: string, message: string): string {
  return buildDiagnosticGroupKey('server_error_500', [route, hashMessage(message.slice(0, 200))])
}

export function buildUploadFailureKey(bucket: string, code: string): string {
  return buildDiagnosticGroupKey('upload_failure', [bucket, code])
}

export function buildTimeoutKey(route: string): string {
  return buildDiagnosticGroupKey('request_timeout', [route])
}

export function buildJsErrorKey(route: string, message: string): string {
  return buildDiagnosticGroupKey('client_js_error', [route, hashMessage(message.slice(0, 200))])
}

function shouldSkipDedupe(key: string, dedupeMs: number): boolean {
  const now = Date.now()
  const last = sessionDedupe.get(key)
  if (last != null && now - last < dedupeMs) return true
  sessionDedupe.set(key, now)
  return false
}

export async function trackDiagnosticEvent(
  eventType: DiagnosticEventType,
  groupKey: string,
  payload: Record<string, unknown> = {},
  options: TrackOptions = {},
): Promise<void> {
  const dedupeKey = options.dedupeKey ?? groupKey
  const dedupeMs = options.dedupeMs ?? DEFAULT_DEDUPE_MS
  if (shouldSkipDedupe(dedupeKey, dedupeMs)) return

  try {
    const sanitized = { ...payload }
    if (typeof sanitized.message === 'string') {
      sanitized.message = sanitized.message.slice(0, 500)
    }
    if (typeof sanitized.stack === 'string') {
      sanitized.stack = sanitized.stack.slice(0, 2000)
    }

    await supabase.rpc('log_diagnostic_event', {
      p_event_type: eventType,
      p_group_key: groupKey,
      p_payload: sanitized,
      p_user_role: options.userRole ?? null,
    })
  } catch {
    // Telemetria não deve quebrar fluxo do usuário
  }
}

export function getCurrentRoute(): string {
  if (typeof window === 'undefined') return '/'
  return `${window.location.pathname}${window.location.search}`.slice(0, 300)
}

export function installDiagnosticErrorHandlers(userRole?: DiagnosticUserRole): () => void {
  function onError(event: ErrorEvent) {
    const message = event.message || 'Erro desconhecido'
    const route = getCurrentRoute()
    void trackDiagnosticEvent(
      'client_js_error',
      buildJsErrorKey(route, message),
      {
        message,
        stack: event.error?.stack,
        route,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        user_agent: navigator.userAgent,
      },
      { userRole, dedupeMs: 30_000 },
    )
  }

  function onRejection(event: PromiseRejectionEvent) {
    const reason = event.reason
    const message =
      reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : 'Promise rejection'
    const route = getCurrentRoute()
    void trackDiagnosticEvent(
      'client_js_error',
      buildJsErrorKey(route, message),
      {
        message,
        stack: reason instanceof Error ? reason.stack : undefined,
        route,
        user_agent: navigator.userAgent,
      },
      { userRole, dedupeMs: 30_000 },
    )
  }

  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)

  return () => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onRejection)
  }
}

export function trackSupabaseError(
  error: { message?: string; code?: string; status?: number },
  context: { route?: string; operation?: string },
  userRole?: DiagnosticUserRole,
): void {
  const route = context.route ?? getCurrentRoute()
  const message = error.message ?? 'Erro desconhecido'
  const status = error.status ?? (error.code === 'PGRST301' ? 401 : undefined)

  if (status === 500 || error.code === '500') {
    void trackDiagnosticEvent(
      'server_error_500',
      buildServerErrorKey(route, message),
      { message, route, operation: context.operation, code: error.code },
      { userRole },
    )
    return
  }

  if (
    message.toLowerCase().includes('timeout') ||
    message.toLowerCase().includes('timed out') ||
    error.code === '57014'
  ) {
    void trackDiagnosticEvent(
      'request_timeout',
      buildTimeoutKey(route),
      { message, route, operation: context.operation, code: error.code },
      { userRole },
    )
  }
}
