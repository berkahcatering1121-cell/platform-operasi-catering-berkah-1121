import { useState } from 'react'
import { Card, EmptyState, ErrorState, LoadingRows } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import RowActions from '@/components/ui/RowActions'
import { Field, InputLegend, SelectField } from '@/components/ui/Field'
import { StatusBadge } from '@/components/ui/Badge'
import { TD, TD_R, TH, TH_R } from '@/components/ui/table'
import { formatRupiah } from '@/lib/format'
import { useDeleteEmployee, useEmployees, useSaveEmployee } from './api'
import type { Employee, SalaryType } from '@/lib/db'

interface FormState {
  id?: string
  name: string
  position: string
  department: string
  salary_type: SalaryType
  base_salary: string
  daily_wage: string
}
const EMPTY: FormState = {
  name: '', position: '', department: '', salary_type: 'Bulanan', base_salary: '', daily_wage: '',
}

export default function KaryawanTab() {
  const employees = useEmployees()
  const save = useSaveEmployee()
  const del = useDeleteEmployee()

  const [form, setForm] = useState<FormState | null>(null)
  const [toDelete, setToDelete] = useState<Employee | null>(null)

  if (employees.isLoading) return <LoadingRows />
  if (employees.error) return <ErrorState message={(employees.error as Error).message} />

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form || !form.name.trim() || save.isPending) return
    save.mutate(
      {
        id: form.id,
        name: form.name,
        position: form.position || null,
        department: form.department || null,
        salary_type: form.salary_type,
        base_salary: Number(form.base_salary) || 0,
        daily_wage: Number(form.daily_wage) || 0,
      },
      { onSuccess: () => setForm(null) },
    )
  }

  return (
    <>
      <Card
        title="Karyawan"
        subtitle={`${employees.data?.length ?? 0} karyawan · dipakai sebagai PIC & basis Gaji`}
        action={<Button onClick={() => setForm({ ...EMPTY })}>+ Karyawan</Button>}
        bodyClassName=""
      >
        <div className="cb-scroll overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Nama</th>
                <th className={TH}>Jabatan</th>
                <th className={TH}>Departemen</th>
                <th className={TH}>Tipe Gaji</th>
                <th className={TH_R}>Gaji Pokok</th>
                <th className={TH_R}>Upah / Hari</th>
                <th className={TH_R}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {employees.data && employees.data.length > 0 ? (
                employees.data.map((e) => (
                  <tr key={e.id}>
                    <td className={TD + ' font-bold text-ink'}>{e.name}</td>
                    <td className={TD}>{e.position ?? '—'}</td>
                    <td className={TD}>{e.department ?? '—'}</td>
                    <td className={TD}>
                      <StatusBadge status={e.salary_type} />
                    </td>
                    <td className={TD_R}>{e.salary_type === 'Bulanan' ? formatRupiah(e.base_salary) : '—'}</td>
                    <td className={TD_R}>{e.salary_type === 'Harian' ? formatRupiah(e.daily_wage) : '—'}</td>
                    <td className={TD_R}>
                      <RowActions
                        onEdit={() =>
                          setForm({
                            id: e.id,
                            name: e.name,
                            position: e.position ?? '',
                            department: e.department ?? '',
                            salary_type: e.salary_type,
                            base_salary: e.base_salary ? String(e.base_salary) : '',
                            daily_wage: e.daily_wage ? String(e.daily_wage) : '',
                          })
                        }
                        onDelete={() => setToDelete(e)}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <EmptyState message="Belum ada karyawan. Tambah lewat tombol + Karyawan." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? 'Edit Karyawan' : 'Tambah Karyawan'}
        subtitle="Basis perhitungan Gaji Karyawan"
        footer={
          <>
            <Button variant="secondary" onClick={() => setForm(null)} disabled={save.isPending}>
              Batal
            </Button>
            <Button onClick={submit} disabled={save.isPending || !form?.name.trim()}>
              {save.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </>
        }
      >
        {form && (
          <form onSubmit={submit} className="space-y-3.5">
            <InputLegend />
            <Field
              label="Nama"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ketik nama karyawan"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Jabatan"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                placeholder="Ketik jabatan"
              />
              <Field
                label="Departemen"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="Ketik departemen"
              />
            </div>
            <SelectField
              label="Tipe Gaji"
              variant="manual"
              options={[
                { value: 'Bulanan', label: 'Bulanan (gaji tetap)' },
                { value: 'Harian', label: 'Harian (upah × hari kerja)' },
              ]}
              value={form.salary_type}
              onChange={(e) => setForm({ ...form, salary_type: e.target.value as SalaryType })}
            />
            {form.salary_type === 'Bulanan' ? (
              <Field
                label="Gaji Pokok / Bulan"
                prefix="Rp"
                inputMode="numeric"
                value={form.base_salary}
                onChange={(e) => setForm({ ...form, base_salary: e.target.value.replace(/[^\d]/g, '') })}
                placeholder="Masukkan nominal"
              />
            ) : (
              <Field
                label="Upah / Hari"
                prefix="Rp"
                inputMode="numeric"
                value={form.daily_wage}
                onChange={(e) => setForm({ ...form, daily_wage: e.target.value.replace(/[^\d]/g, '') })}
                placeholder="Masukkan nominal"
              />
            )}
            {save.isError && <p className="text-[11.5px] text-danger">{(save.error as Error).message}</p>}
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        message={`Hapus karyawan "${toDelete?.name}"? Data gaji terkait juga akan terhapus.`}
        busy={del.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      />
    </>
  )
}
