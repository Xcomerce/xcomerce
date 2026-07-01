import { createContext, useContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { RegisterInput, SupplierStatus, UserRole } from '@keve/shared'
import type { UserProfile } from '@/services/profile'

export type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  roles: UserRole[]
  activeRole: UserRole | null
  supplierStatus: SupplierStatus | null
  isLoading: boolean
  isSupplier: boolean
  isSupplierApproved: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: RegisterInput) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
