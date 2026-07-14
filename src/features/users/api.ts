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
  must_change_password: boolean
  visible_password: string | null
}

export interface RoleRow {
  name: string
  is_core: boolean
}

// Modules an admin can grant. Dashboard & P&L are now revocable permissions
// too; only Manajemen Pengguna (pengguna) stays Super-Admin-only.
export const ASSIGNABLE_MODULES = MODULES.filter((m) => m.key !== 'pengguna')

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
          .select('id, username, full_name, role, modules, is_active, must_change_password, visible_password')
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

// Invoke the admin-users edge function, surfacing its JSON error message and
// returning the parsed response body (e.g. { ok, tempPassword }).
async function invokeAdmin(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke('admin-users', { body })
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
  return (data ?? {}) as Record<string, unknown>
}

export interface UserInput {
  id?: string
  username: string
  full_name: string
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
    // Returns the generated temp password on create (undefined on update).
    mutationFn: async (input: UserInput): Promise<{ tempPassword?: string }> => {
      await ensureRole(input.role)
      const res = await invokeAdmin({
        action: input.id ? 'update' : 'create',
        id: input.id,
        username: input.username,
        full_name: input.full_name,
        role: input.role.trim(),
        modules: input.modules,
      })
      return { tempPassword: res.tempPassword as string | undefined }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.users })
      qc.invalidateQueries({ queryKey: userKeys.roles })
    },
  })
}

// Super Admin issues a fresh random temp password; user must change it again
// on next login. Returns the new temp password to hand over.
export function useResetPassword() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<{ tempPassword?: string }> => {
      const res = await invokeAdmin({ action: 'resetPassword', id })
      return { tempPassword: res.tempPassword as string | undefined }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.users }),
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
