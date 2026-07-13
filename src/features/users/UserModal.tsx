import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { Field, InputLegend, SelectField } from '@/components/ui/Field'
import type { ModuleKey } from '@/lib/modules'
import {
  ASSIGNABLE_MODULES,
  useResetPassword,
  useSaveUser,
  type RoleRow,
  type UserInput,
  type UserRow,
} from './api'

interface FormState {
  full_name: string
  username: string
  role: string
  customRole: string
  useCustomRole: boolean
  modules: ModuleKey[]
}

function toForm(u?: UserRow | null): FormState {
  return {
    full_name: u?.full_name ?? '',
    username: u?.username ?? '',
    role: u?.role ?? 'Admin',
    customRole: '',
    useCustomRole: false,
    modules: u?.modules ?? [],
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editing: UserRow | null
  roles: RoleRow[]
}

// Panel shown after create / reset: the temporary password to hand over.
function CredentialsPanel({ username, password }: { username: string; password: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`ID: ${username}\nPassword sementara: ${password}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard may be blocked; the values are visible anyway */
    }
  }
  return (
    <div className="space-y-3">
      <div className="rounded-field border border-ok-border bg-ok-bg px-3.5 py-3">
        <div className="flex items-center gap-2 text-[12.5px] font-extrabold text-ok-text">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Akun berhasil dibuat
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-body">
          Berikan ID & password sementara ini kepada pengguna. Saat login pertama, ia akan diminta membuat
          password sendiri. Anda tetap bisa melihat password terbarunya di tabel.
        </p>
      </div>

      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 rounded-field border border-app-border bg-app-panel px-4 py-3.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">ID Pengguna</span>
        <span className="font-mono text-[14px] font-bold text-ink">{username}</span>
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Password</span>
        <span className="font-mono text-[16px] font-extrabold tracking-wide text-brand">{password}</span>
      </div>

      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-2 rounded-btn border border-app-border bg-app-card px-3.5 py-2 text-[12.5px] font-bold text-ink-body hover:bg-app-panel"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        {copied ? 'Tersalin!' : 'Salin ID & Password'}
      </button>
    </div>
  )
}

export default function UserModal({ open, onClose, editing, roles }: Props) {
  const save = useSaveUser()
  const reset = useResetPassword()
  const [form, setForm] = useState<FormState>(toForm())
  // When set, the modal shows the temp-password panel instead of the form.
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null)

  useEffect(() => {
    if (open) {
      setForm(toForm(editing))
      setCredentials(null)
      save.reset()
      reset.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))
  const effectiveRole = form.useCustomRole ? form.customRole : form.role
  const isSuperAdmin = effectiveRole === 'Super Admin'

  const toggleModule = (key: ModuleKey) =>
    setForm((f) => ({
      ...f,
      modules: f.modules.includes(key) ? f.modules.filter((m) => m !== key) : [...f.modules, key],
    }))

  const submit = () => {
    if (save.isPending) return
    if (!form.full_name.trim() || !form.username.trim()) return
    if (form.useCustomRole && !form.customRole.trim()) return

    const payload: UserInput = {
      id: editing?.id,
      full_name: form.full_name.trim(),
      username: form.username.trim(),
      role: effectiveRole.trim(),
      modules: isSuperAdmin ? [] : form.modules,
    }
    save.mutate(payload, {
      onSuccess: (res) => {
        // Create → show the generated password; update → just close.
        if (res.tempPassword) setCredentials({ username: payload.username, password: res.tempPassword })
        else onClose()
      },
    })
  }

  const doReset = () => {
    if (!editing || reset.isPending) return
    reset.mutate(editing.id, {
      onSuccess: (res) => {
        if (res.tempPassword) setCredentials({ username: editing.username, password: res.tempPassword })
      },
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={credentials ? 'Password Sementara' : editing ? 'Edit Pengguna' : 'Tambah Pengguna'}
      subtitle={credentials ? 'Simpan & berikan ke pengguna' : 'Akun login, peran, dan izin per-modul'}
      footer={
        credentials ? (
          <Button onClick={onClose}>Selesai</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
              Batal
            </Button>
            <Button onClick={submit} disabled={save.isPending}>
              {save.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </>
        )
      }
    >
      {credentials ? (
        <CredentialsPanel username={credentials.username} password={credentials.password} />
      ) : (
        <div className="space-y-3.5">
          <InputLegend />

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Nama"
              value={form.full_name}
              onChange={(e) => set({ full_name: e.target.value })}
              placeholder="Ketik Nama Lengkap"
            />
            <Field
              label="ID Pengguna"
              hint="untuk login"
              value={form.username}
              onChange={(e) => set({ username: e.target.value.replace(/\s/g, '') })}
              placeholder="Ketik ID Login"
            />
          </div>

          {/* Password lifecycle: auto-generated on create, reset button on edit. */}
          {editing ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-field border border-app-border bg-app-panel px-3.5 py-2.5">
              <div className="text-[12px] text-ink-body">
                <div className="font-bold text-ink">Password</div>
                <div className="text-ink-muted">
                  {editing.visible_password
                    ? 'Password saat ini dapat dilihat di tabel.'
                    : 'Password tidak tersimpan (akun lama).'}
                  {editing.must_change_password && ' Menunggu pengguna membuat password baru.'}
                </div>
              </div>
              <button
                type="button"
                onClick={doReset}
                disabled={reset.isPending}
                className="inline-flex items-center gap-1.5 rounded-btn border border-gold-border bg-gold-tint px-3 py-2 text-[12.5px] font-bold text-gold-text hover:bg-gold-pale disabled:opacity-60"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
                {reset.isPending ? 'Memproses…' : 'Reset Password'}
              </button>
            </div>
          ) : (
            <div className="rounded-field border border-manual-border bg-manual-bg px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-body">
              <b className="text-manual">Password otomatis:</b> sistem akan membuat password sementara yang
              acak. Setelah disimpan, password akan ditampilkan untuk Anda berikan ke pengguna.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {form.useCustomRole ? (
              <Field
                label="Role baru"
                value={form.customRole}
                onChange={(e) => set({ customRole: e.target.value })}
                placeholder="Ketik Nama Peran"
              />
            ) : (
              <SelectField
                label="Role"
                options={roles.map((r) => ({ value: r.name, label: r.name }))}
                value={form.role}
                onChange={(e) => set({ role: e.target.value })}
              />
            )}
            <label className="flex items-end pb-2.5 text-[12px] font-semibold text-ink-body">
              <span className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.useCustomRole}
                  onChange={(e) => set({ useCustomRole: e.target.checked })}
                  className="h-4 w-4 accent-[#16603F]"
                />
                Buat role baru (custom)
              </span>
            </label>
          </div>

          <div>
            <div className="mb-1.5 text-[12px] font-semibold text-ink-body">Izin Modul</div>
            {isSuperAdmin ? (
              <div className="rounded-field border border-master-border bg-master-bg px-3 py-2.5 text-[12px] text-master">
                <b>Super Admin</b> memiliki akses penuh ke semua modul secara otomatis.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {ASSIGNABLE_MODULES.map((m) => (
                    <label
                      key={m.key}
                      className="flex items-center gap-2 rounded-field border border-app-border bg-app-panel px-2.5 py-2 text-[12px] font-medium text-ink-body"
                    >
                      <input
                        type="checkbox"
                        checked={form.modules.includes(m.key)}
                        onChange={() => toggleModule(m.key)}
                        className="h-4 w-4 accent-[#16603F]"
                      />
                      {m.label}
                    </label>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-ink-faint">
                  Dashboard & P&L selalu dapat diakses semua pengguna.
                </p>
              </>
            )}
          </div>

          {(save.isError || reset.isError) && (
            <p className="text-[11.5px] text-danger">{((save.error || reset.error) as Error).message}</p>
          )}
        </div>
      )}
    </Modal>
  )
}
