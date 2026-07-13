import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { Field, InputLegend, SelectField } from '@/components/ui/Field'
import type { ModuleKey } from '@/lib/modules'
import { ASSIGNABLE_MODULES, useSaveUser, type RoleRow, type UserInput, type UserRow } from './api'

interface FormState {
  full_name: string
  username: string
  password: string
  role: string
  customRole: string
  useCustomRole: boolean
  modules: ModuleKey[]
}

function toForm(u?: UserRow | null): FormState {
  return {
    full_name: u?.full_name ?? '',
    username: u?.username ?? '',
    password: '',
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

export default function UserModal({ open, onClose, editing, roles }: Props) {
  const save = useSaveUser()
  const [form, setForm] = useState<FormState>(toForm())

  useEffect(() => {
    if (open) setForm(toForm(editing))
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
    if (!editing && !form.password) return // password required on create
    if (form.useCustomRole && !form.customRole.trim()) return

    const payload: UserInput = {
      id: editing?.id,
      full_name: form.full_name.trim(),
      username: form.username.trim(),
      password: form.password || undefined,
      role: effectiveRole.trim(),
      modules: isSuperAdmin ? [] : form.modules,
    }
    save.mutate(payload, { onSuccess: onClose })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={editing ? 'Edit Pengguna' : 'Tambah Pengguna'}
      subtitle="Akun login, peran, dan izin per-modul"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Batal
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </>
      }
    >
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

        <Field
          label={editing ? 'Password (kosongkan bila tidak diubah)' : 'Password'}
          type="password"
          value={form.password}
          onChange={(e) => set({ password: e.target.value })}
          placeholder={editing ? '••••••••' : 'minimal 6 karakter'}
        />

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

        {save.isError && <p className="text-[11.5px] text-danger">{(save.error as Error).message}</p>}
      </div>
    </Modal>
  )
}
