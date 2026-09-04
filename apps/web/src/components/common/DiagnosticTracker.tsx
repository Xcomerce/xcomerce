import { useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { installDiagnosticErrorHandlers, type DiagnosticUserRole } from '@/lib/diagnostics'

function resolveDiagnosticRole(activeRole: string | null | undefined): DiagnosticUserRole | undefined {
  if (activeRole === 'buyer' || activeRole === 'supplier') return activeRole
  return undefined
}

export function DiagnosticTracker() {
  const { activeRole } = useAuth()

  useEffect(() => {
    return installDiagnosticErrorHandlers(resolveDiagnosticRole(activeRole))
  }, [activeRole])

  return null
}
