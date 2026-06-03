import { createContext, useContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { UserRole, SupplierStatus } from '@keve/shared'
import type { RegisterInput } from '@keve/shared'
import type { UserProfile, UserProfileBundle } from '@/services/profile'

export type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  roles: UserRole[]
  activeRole: UserRole | null
  supplierStatus: SupplierStatus | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<UserProfileBundle | null>
  signUp: (input: RegisterInput, role: UserRole) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  setActiveRole: (role: UserRole) => void
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
