import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getDashboardForRole, type UserRole, type SupplierStatus } from '@keve/shared'
import type { RegisterInput } from '@keve/shared'
import { AuthContext } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import {
  resetPasswordForEmail,
  signInWithEmail,
  signOut as authSignOut,
  signUpWithEmail,
  updatePassword as authUpdatePassword,
} from '@/services/auth'
import { fetchUserProfile, type UserProfile } from '@/services/profile'

const ACTIVE_ROLE_KEY = 'keve.activeRole'

function readStoredRole(): UserRole | null {
  const value = localStorage.getItem(ACTIVE_ROLE_KEY)
  return value as UserRole | null
}

function writeStoredRole(role: UserRole | null) {
  if (role) localStorage.setItem(ACTIVE_ROLE_KEY, role)
  else localStorage.removeItem(ACTIVE_ROLE_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [roles, setRoles] = useState<UserRole[]>([])
  const [activeRole, setActiveRoleState] = useState<UserRole | null>(readStoredRole())
  const [supplierStatus, setSupplierStatus] = useState<SupplierStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    const bundle = await fetchUserProfile(userId)
    if (!bundle) {
      setProfile(null)
      setRoles([])
      setSupplierStatus(null)
      return
    }
    setProfile(bundle.profile)
    setRoles(bundle.roles)
    setSupplierStatus(bundle.supplierStatus)

    const stored = readStoredRole()
    if (stored && bundle.roles.includes(stored)) {
      setActiveRoleState(stored)
    } else if (bundle.roles.length === 1) {
      setActiveRoleState(bundle.roles[0])
      writeStoredRole(bundle.roles[0])
    } else {
      setActiveRoleState(null)
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

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'TOKEN_REFRESHED') {
        setSession(nextSession)
        return
      }
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setUser(null)
        setProfile(null)
        setRoles([])
        setSupplierStatus(null)
        setActiveRoleState(null)
        writeStoredRole(null)
        return
      }
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      if (nextSession?.user) {
        loadProfile(nextSession.user.id)
      } else {
        setProfile(null)
        setRoles([])
        setSupplierStatus(null)
        setActiveRoleState(null)
        writeStoredRole(null)
      }
    })

    return () => subscription.subscription.unsubscribe()
  }, [loadProfile])

  const setActiveRole = useCallback((role: UserRole) => {
    setActiveRoleState(role)
    writeStoredRole(role)
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { session: nextSession } = await signInWithEmail(email, password)
    if (!nextSession?.user) return null
    const bundle = await fetchUserProfile(nextSession.user.id)
    if (!bundle) return null
    setProfile(bundle.profile)
    setRoles(bundle.roles)
    setSupplierStatus(bundle.supplierStatus)
    const stored = readStoredRole()
    if (stored && bundle.roles.includes(stored)) {
      setActiveRoleState(stored)
    } else if (bundle.roles.length === 1) {
      setActiveRoleState(bundle.roles[0])
      writeStoredRole(bundle.roles[0])
    } else {
      setActiveRoleState(null)
    }
    return bundle
  }, [])

  const signUp = useCallback(async (input: RegisterInput, role: UserRole) => {
    const { session: nextSession } = await signUpWithEmail(input, role)
    if (nextSession?.user) {
      await loadProfile(nextSession.user.id)
      setActiveRole(role)
    }
  }, [loadProfile, setActiveRole])

  const signOut = useCallback(async () => {
    await authSignOut()
    setProfile(null)
    setRoles([])
    setSupplierStatus(null)
    setActiveRoleState(null)
    writeStoredRole(null)
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    await resetPasswordForEmail(email)
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    await authUpdatePassword(password)
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
      isAuthenticated: !!session,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
      setActiveRole,
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
      updatePassword,
      setActiveRole,
      refreshProfile,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { getDashboardForRole }
