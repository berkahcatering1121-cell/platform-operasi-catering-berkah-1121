import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { MODULES, type ModuleKey } from '@/lib/modules'

export interface UserRow {
  id: string
  username: string
  full_name: string
  role: string
  modules: ModuleKey[]
  is_active: boolean
}

export interface RoleRow {
  name: string
  is_core: boolean
}

// Modules an admin can grant. dashboard & pnl are implicit; pengguna is
// Super-Admin-only, so neither is a checkbox.
export const ASSIGNABLE_MODULES = MODULES.filter(
  (m) => !['dashboard', 'pnl', 'pengguna'].includes(m.key),
)

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export const userKeys = {
  users: ['users'] as const,
  roles: ['roles'] as const,
}

export function useUsers() {
  return useQuery({
    queryKey: userKeys.users,
    queryFn: async () =>
      unwrap<UserRow[]>(
        await supabase
          .from('profiles')
          .select('id, username, full_name, role, modules, is_active')
          .order('full_name'),
      ),
  })
}

export function useRoles() {
  return useQuery({
    queryKey: userKeys.roles,
    queryFn: async () =>
      unwrap<RoleRow[]>(await supabase.from('roles').select('name, is_core').order('is_core', { ascending: false }).order('name')),
  })
}

// Invoke the admin-users edge function, surfacing its JSON error message.
async function invokeAdmin(body: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.functions.invoke('admin-users', { body })
  if (error) {
    let msg = error.message
    try {
      // FunctionsHttpError carries the Response in `context`.
      const ctx = (error as unknown as { context?: Response }).context
      if (ctx) {
        const parsed = await ctx.json()
        if (parsed?.error) msg = parsed.error
      }
    } catch {
      /* keep default message */
    }
    if (/Failed to send|fetch/i.test(msg)) {
      msg = 'Edge Function "admin-users" belum ter-deploy atau tidak dapat dihubungi. Lihat supabase/RUNBOOK.md.'
    }
    throw new Error(msg)
  }
}

export interface UserInput {
  id?: string
  username: string
  full_name: string
  password?: string
  role: string
  modules: ModuleKey[]
}

// Ensure a (possibly new custom) role exists before assigning it.
async function ensureRole(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return
  const { data } = await supabase.from('roles').select('name').eq('name', trimmed).maybeSingle()
  if (!data) unwrap(await supabase.from('roles').insert({ name: trimmed, is_core: false }).select('name'))
}

export function useSaveUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UserInput) => {
      await ensureRole(input.role)
      await invokeAdmin({
        action: input.id ? 'update' : 'create',
        id: input.id,
        username: input.username,
        full_name: input.full_name,
        password: input.password || undefined,
        role: input.role.trim(),
        modules: input.modules,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.users })
      qc.invalidateQueries({ queryKey: userKeys.roles })
    },
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await invokeAdmin({ action: 'delete', id })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.users }),
  })
}

export function useAddRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      unwrap(await supabase.from('roles').insert({ name: name.trim(), is_core: false }).select('name'))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.roles }),
  })
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      unwrap(await supabase.from('roles').delete().eq('name', name).select('name'))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.roles })
    },
  })
}
