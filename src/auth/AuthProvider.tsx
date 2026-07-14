import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { usernameToEmail } from '@/lib/env'
import { MODULES, type ModuleKey } from '@/lib/modules'

export interface Profile {
  id: string
  username: string
  full_name: string
  role: string
  modules: ModuleKey[]
  is_active: boolean
  must_change_password: boolean
}

interface AuthContextValue {
  loading: boolean
  session: Session | null
  profile: Profile | null
  isSuperAdmin: boolean
  isAdminOrSuper: boolean
  /** Whether the current user may see/operate a module. Mirrors the RLS rules. */
  canAccess: (key: ModuleKey) => boolean
  /** First accessible route (sidebar order); null when the user has no modules. */
  landingPath: string | null
  signIn: (username: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  /** Re-fetch the current user's profile (e.g. after a forced password change). */
  refreshProfile: () => Promise<void>
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null)

async function loadProfile(userId: string): Promise<Profile | null> {
  // Core fields only — these always exist, so the profile never fails to load.
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, role, modules, is_active')
    .eq('id', userId)
    .single()
  if (error || !data) return null

  // `must_change_password` is a newer column. Read it defensively so the app
  // keeps working on databases where the migration hasn't been applied yet
  // (defaults to false on any error / missing column).
  let mustChange = false
  const { data: pw } = await supabase
    .from('profiles')
    .select('must_change_password')
    .eq('id', userId)
    .maybeSingle()
  if (pw && typeof (pw as { must_change_password?: boolean }).must_change_password === 'boolean') {
    mustChange = (pw as { must_change_password: boolean }).must_change_password
  }

  return {
    ...data,
    modules: (data.modules ?? []) as ModuleKey[],
    must_change_password: mustChange,
  } as Profile
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session) setProfile(await loadProfile(data.session.user.id))
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      if (!active) return
      setSession(next)
      setProfile(next ? await loadProfile(next.user.id) : null)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (username: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    })
    if (error) return { error: 'ID Pengguna atau password salah.' }
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getUser()
    if (data.user) setProfile(await loadProfile(data.user.id))
  }, [])

  const isSuperAdmin = profile?.role === 'Super Admin'
  const isAdminOrSuper = profile?.role === 'Super Admin' || profile?.role === 'Admin'

  const canAccess = useCallback(
    (key: ModuleKey) => {
      if (!profile) return false
      if (profile.role === 'Super Admin') return true
      if (key === 'pengguna') return false // Super Admin only
      // Dashboard & P&L are now regular, revocable permissions like the rest.
      return profile.modules.includes(key)
    },
    [profile],
  )

  // First module the user can open (in sidebar order) — used as the landing
  // route and as the redirect target for guarded pages. null = no access.
  const landingPath = useMemo(() => MODULES.find((m) => canAccess(m.key))?.path ?? null, [canAccess])

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      profile,
      isSuperAdmin,
      isAdminOrSuper,
      canAccess,
      landingPath,
      signIn,
      signOut,
      refreshProfile,
    }),
    [loading, session, profile, isSuperAdmin, isAdminOrSuper, canAccess, landingPath, signIn, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
