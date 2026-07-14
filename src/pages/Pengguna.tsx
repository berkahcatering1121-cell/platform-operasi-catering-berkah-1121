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
  useSetCanSettle,
  useAddRole,
  useDeleteRole,
  type RoleRow,
  type UserRow,
} from '@/features/users/api'
import UserModal from '@/features/users/UserModal'

// Super-Admin-only view of a user's current password: masked by default with
// an eye toggle and copy button. Shows a status hint while the user still
// needs to pick their own password.
function PasswordCell({ user }: { user: UserRow }) {
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!user.visible_password) {
    return <span className="text-[12px] text-ink-faint">—</span>
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(user.visible_password ?? '')
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      /* clipboard may be blocked */
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[13px] font-bold text-ink">
        {show ? user.visible_password : '••••••••'}
      </span>
      <button
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Sembunyikan' : 'Tampilkan'}
        className="rounded p-1 text-ink-muted hover:bg-app-panel hover:text-ink"
      >
        {show ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
      <button
        onClick={copy}
        aria-label="Salin password"
        className="rounded p-1 text-ink-muted hover:bg-app-panel hover:text-ink"
      >
        {copied ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-ok-text">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
      {user.must_change_password && (
        <span className="whitespace-nowrap rounded-pill border border-warn-border bg-warn-bg px-2 py-[2px] text-[10px] font-bold text-warn-text">
          belum diganti
        </span>
      )}
    </div>
  )
}

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
  const setCanSettle = useSetCanSettle()

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
                    <th className={TH}>Password</th>
                    <th className={TH}>Role</th>
                    <th className={TH}>Izin Modul</th>
                    <th className={TH}>Approve Settle</th>
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
                          <PasswordCell user={u} />
                        </td>
                        <td className={TD}>
                          <RoleBadge role={u.role} />
                        </td>
                        <td className={TD + ' max-w-[320px] truncate'} title={moduleSummary(u)}>
                          {moduleSummary(u)}
                        </td>
                        <td className={TD}>
                          {u.role === 'Super Admin' ? (
                            <span className="text-[11px] font-semibold text-ink-faint">Otomatis</span>
                          ) : (
                            <button
                              onClick={() => setCanSettle.mutate({ id: u.id, can_settle: !u.can_settle })}
                              disabled={setCanSettle.isPending}
                              title="Boleh approve settle Petty Cash (tim Finance)"
                              className={`inline-flex items-center rounded-pill border px-2.5 py-[3px] text-[10.5px] font-extrabold transition disabled:opacity-60 ${
                                u.can_settle
                                  ? 'border-ok-border bg-ok-bg text-ok-text'
                                  : 'border-app-border bg-app-panel text-ink-muted hover:bg-app-card'
                              }`}
                            >
                              {u.can_settle ? 'Finance ✓' : 'Tidak'}
                            </button>
                          )}
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
                      <td colSpan={8}>
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
