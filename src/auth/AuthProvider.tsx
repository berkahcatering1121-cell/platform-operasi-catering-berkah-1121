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
  can_settle: boolean
}

interface AuthContextValue {
  loading: boolean
  session: Session | null
  profile: Profile | null
  isSuperAdmin: boolean
  isAdminOrSuper: boolean
  /** May approve/change Petty Cash settle status (Super Admin or Finance). */
  canSettle: boolean
  /** Whether the current user may see/operate a module. Mirrors the RLS rules. */
  canAccess: (key: ModuleKey) => boolean
  /** First accessible route (sidebar order); null when the user has no modules. */
  landingPath: string | null
  /** True when the signed-in user's profile could not be loaded (e.g. network). */
  profileFailed: boolean
  signIn: (username: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  /** Re-fetch the current user's profile (e.g. after a forced password change). */
  refreshProfile: () => Promise<void>
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null)

// Reject if a promise does not settle within `ms` so the boot flow never hangs
// forever on a stalled network (a common cause of "can't open" on some phones).
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const to = setTimeout(() => reject(new Error('timeout')), ms)
    p.then(
      (v) => {
        clearTimeout(to)
        resolve(v)
      },
      (e) => {
        clearTimeout(to)
        reject(e)
      },
    )
  })
}

async function loadProfile(userId: string): Promise<Profile | null> {
  // Core fields only - these always exist, so the profile never fails to load.
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

  // `can_settle` (Petty Cash approval) - also read defensively.
  let canSettleFlag = false
  const { data: cs } = await supabase
    .from('profiles')
    .select('can_settle')
    .eq('id', userId)
    .maybeSingle()
  if (cs && typeof (cs as { can_settle?: boolean }).can_settle === 'boolean') {
    canSettleFlag = (cs as { can_settle: boolean }).can_settle
  }

  return {
    ...data,
    modules: (data.modules ?? []) as ModuleKey[],
    must_change_password: mustChange,
    can_settle: canSettleFlag,
  } as Profile
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileFailed, setProfileFailed] = useState(false)

  // Load the profile with a timeout. On failure, flag it so the UI can offer a
  // retry instead of holding on the splash forever.
  const loadProfileSafe = useCallback(async (userId: string) => {
    setProfileFailed(false)
    try {
      const p = await withTimeout(loadProfile(userId), 12000)
      setProfile(p)
      setProfileFailed(p === null)
    } catch {
      setProfile(null)
      setProfileFailed(true)
    }
  }, [])

  useEffect(() => {
    let active = true
    // Always release the splash, even if the auth/network call fails or stalls.
    const releaseSplash = () => {
      if (active) setLoading(false)
    }
    const failSafe = setTimeout(releaseSplash, 8000)

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return
        setSession(data.session)
        if (data.session) void loadProfileSafe(data.session.user.id)
      })
      .catch(() => {
        /* network/auth error: fall through to the login screen */
      })
      .finally(releaseSplash)

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return
      setSession(next)
      if (next) void loadProfileSafe(next.user.id)
      else {
        setProfile(null)
        setProfileFailed(false)
      }
    })

    return () => {
      active = false
      clearTimeout(failSafe)
      sub.subscription.unsubscribe()
    }
  }, [loadProfileSafe])

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
  const canSettle = isSuperAdmin || profile?.can_settle === true

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

  // First module the user can open (in sidebar order) - used as the landing
  // route and as the redirect target for guarded pages. null = no access.
  const landingPath = useMemo(() => MODULES.find((m) => canAccess(m.key))?.path ?? null, [canAccess])

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      profile,
      isSuperAdmin,
      isAdminOrSuper,
      canSettle,
      canAccess,
      landingPath,
      profileFailed,
      signIn,
      signOut,
      refreshProfile,
    }),
    [loading, session, profile, isSuperAdmin, isAdminOrSuper, canSettle, canAccess, landingPath, profileFailed, signIn, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
