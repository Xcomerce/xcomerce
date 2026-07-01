import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { RegisterInput, SupplierStatus, UserRole } from '@keve/shared'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AuthContext } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import {
  resetPasswordForEmail,
  signInWithEmail,
  signOut as authSignOut,
  signUpWithEmail,
} from '@/services/auth'
import { fetchUserProfile, type UserProfile } from '@/services/profile'

const ACTIVE_ROLE_KEY = 'keve.activeRole.supplier'

async function readStoredRole(): Promise<UserRole | null> {
  const value = await AsyncStorage.getItem(ACTIVE_ROLE_KEY)
  return value as UserRole | null
}

async function writeStoredRole(role: UserRole | null) {
  if (role) await AsyncStorage.setItem(ACTIVE_ROLE_KEY, role)
  else await AsyncStorage.removeItem(ACTIVE_ROLE_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [roles, setRoles] = useState<UserRole[]>([])
  const [supplierStatus, setSupplierStatus] = useState<SupplierStatus | null>(null)
  const [activeRole, setActiveRoleState] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    const bundle = await fetchUserProfile(userId)
    if (!bundle) {
      setProfile(null)
      setRoles([])
      setSupplierStatus(null)
      await supabase.auth.signOut()
      return
    }
    setProfile(bundle.profile)
    setRoles(bundle.roles)
    setSupplierStatus(bundle.supplierStatus)

    const stored = await readStoredRole()
    if (stored && bundle.roles.includes(stored)) {
      setActiveRoleState(stored)
    } else if (bundle.roles.includes('supplier')) {
      setActiveRoleState('supplier')
      await writeStoredRole('supplier')
    } else {
      setActiveRoleState(bundle.roles[0] ?? null)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    await loadProfile(user.id)
  }, [loadProfile, user])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => setIsLoading(false))
      } else {
        setIsLoading(false)
      }
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      if (nextSession?.user) {
        void loadProfile(nextSession.user.id)
      } else {
        setProfile(null)
        setRoles([])
        setSupplierStatus(null)
        setActiveRoleState(null)
      }
    })

    return () => subscription.subscription.unsubscribe()
  }, [loadProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmail(email, password)
  }, [])

  const signUp = useCallback(async (input: RegisterInput) => {
    await signUpWithEmail(input, 'supplier')
  }, [])

  const signOut = useCallback(async () => {
    await authSignOut()
    await writeStoredRole(null)
    setProfile(null)
    setRoles([])
    setSupplierStatus(null)
    setActiveRoleState(null)
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    await resetPasswordForEmail(email)
  }, [])

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      roles,
      activeRole,
      supplierStatus,
      isLoading,
      isSupplier: roles.includes('supplier'),
      isSupplierApproved: supplierStatus === 'aprovado',
      signIn,
      signUp,
      signOut,
      resetPassword,
      refreshProfile,
    }),
    [
      session,
      user,
      profile,
      roles,
      activeRole,
      supplierStatus,
      isLoading,
      signIn,
      signUp,
      signOut,
      resetPassword,
      refreshProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
