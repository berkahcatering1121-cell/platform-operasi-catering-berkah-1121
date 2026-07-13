import { useMemo, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import Button from '@/components/ui/Button'
import { Card, EmptyState, ErrorState, LoadingRows } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import RowActions from '@/components/ui/RowActions'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { TD, TH, TH_R } from '@/components/ui/table'
import { MODULE_BY_KEY } from '@/lib/modules'
import { useAuth } from '@/auth/AuthProvider'
import {
  useUsers,
  useRoles,
  useDeleteUser,
  useAddRole,
  useDeleteRole,
  type RoleRow,
  type UserRow,
} from '@/features/users/api'
import UserModal from '@/features/users/UserModal'

function RoleBadge({ role }: { role: string }) {
  const isSuper = role === 'Super Admin'
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-pill border px-[9px] py-[3px] text-[10.5px] font-extrabold tracking-[0.03em] ${
        isSuper ? 'text-brand-dark bg-gold-tint border-gold-border' : 'text-manual bg-[#EEF4FD] border-manual-border'
      }`}
    >
      {role}
    </span>
  )
}

function RolesCard({ users, roles }: { users: UserRow[]; roles: RoleRow[] }) {
  const addRole = useAddRole()
  const delRole = useDeleteRole()
  const [name, setName] = useState('')

  const countByRole = useMemo(() => {
    const m = new Map<string, number>()
    for (const u of users) m.set(u.role, (m.get(u.role) ?? 0) + 1)
    return m
  }, [users])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const v = name.trim()
    if (!v || addRole.isPending) return
    addRole.mutate(v, { onSuccess: () => setName('') })
  }

  return (
    <Card title="Daftar Peran" subtitle="Super Admin & Admin terkunci; role custom bisa dihapus bila tak dipakai">
      <div className="mb-3 flex flex-wrap gap-2">
        {roles.map((r) => {
          const inUse = (countByRole.get(r.name) ?? 0) > 0
          const deletable = !r.is_core && !inUse
          return (
            <span
              key={r.name}
              className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-[12px] font-bold ${
                r.is_core
                  ? 'text-brand-dark bg-[#EAF3EC] border-[#CFE0D5]'
                  : 'text-ink-secondary bg-app-panel border-app-border'
              }`}
            >
              {r.name}
              {inUse && !r.is_core && (
                <span className="text-[10px] font-semibold text-ink-faint">· {countByRole.get(r.name)} pengguna</span>
              )}
              {r.is_core && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="opacity-60">
                  <rect x="5" y="11" width="14" height="9" rx="1.5" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
              )}
              {deletable && (
                <button
                  onClick={() => delRole.mutate(r.name)}
                  aria-label={`Hapus role ${r.name}`}
                  className="rounded-full p-0.5 text-ink-muted hover:bg-danger-bg hover:text-danger"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </span>
          )
        })}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tambah role baru…"
          className="field-manual h-10 flex-1 rounded-field px-3 text-[13px] font-semibold outline-none"
        />
        <button
          type="submit"
          disabled={addRole.isPending || !name.trim()}
          className="inline-flex h-10 items-center rounded-btn bg-brand px-3.5 text-[13px] font-bold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          + Tambah
        </button>
      </form>
      {(addRole.isError || delRole.isError) && (
        <p className="mt-2 text-[11.5px] text-danger">
          {((addRole.error || delRole.error) as Error).message}
        </p>
      )}
    </Card>
  )
}

export default function Pengguna() {
  const { profile } = useAuth()
  const users = useUsers()
  const roles = useRoles()
  const del = useDeleteUser()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [toDelete, setToDelete] = useState<UserRow | null>(null)

  const openAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (u: UserRow) => {
    setEditing(u)
    setModalOpen(true)
  }

  const moduleSummary = (u: UserRow) => {
    if (u.role === 'Super Admin') return 'Semua Modul'
    if (!u.modules.length) return 'Dashboard & P&L'
    return u.modules.map((k) => MODULE_BY_KEY[k]?.label ?? k).join(', ')
  }

  return (
    <>
      <PageHeader
        title="Manajemen Pengguna"
        subtitle="Kelola akun, peran, dan izin per-modul (khusus Super Admin)."
        actions={<Button onClick={openAdd}>+ Pengguna</Button>}
      />

      {users.isLoading || roles.isLoading ? (
        <LoadingRows />
      ) : users.error ? (
        <ErrorState message={(users.error as Error).message} />
      ) : (
        <div className="space-y-4">
          <Card bodyClassName="">
            <div className="cb-scroll overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>Nama</th>
                    <th className={TH}>ID</th>
                    <th className={TH}>Role</th>
                    <th className={TH}>Izin Modul</th>
                    <th className={TH}>Status</th>
                    <th className={TH_R}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.data && users.data.length > 0 ? (
                    users.data.map((u) => (
                      <tr key={u.id}>
                        <td className={TD + ' font-bold text-ink'}>{u.full_name}</td>
                        <td className={TD}>{u.username}</td>
                        <td className={TD}>
                          <RoleBadge role={u.role} />
                        </td>
                        <td className={TD + ' max-w-[320px] truncate'} title={moduleSummary(u)}>
                          {moduleSummary(u)}
                        </td>
                        <td className={TD}>
                          <Badge tone={u.is_active ? 'green' : 'neutral'}>{u.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
                        </td>
                        <td className={TD + ' text-right'}>
                          <RowActions
                            onEdit={() => openEdit(u)}
                            onDelete={u.id === profile?.id ? undefined : () => setToDelete(u)}
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState message="Belum ada pengguna." />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <RolesCard users={users.data ?? []} roles={roles.data ?? []} />
        </div>
      )}

      <UserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        roles={roles.data ?? []}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Hapus pengguna"
        message={`Hapus akun "${toDelete?.full_name}" (${toDelete?.username})? Akun login akan dihapus permanen.`}
        busy={del.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      />
    </>
  )
}
