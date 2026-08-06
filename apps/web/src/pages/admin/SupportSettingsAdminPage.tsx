import { Navigate } from 'react-router-dom'

/** Mantido para links antigos — edição fica em /support para admin/comercial. */
export function SupportSettingsAdminPage() {
  return <Navigate to="/support" replace />
}
