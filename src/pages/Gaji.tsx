import { Fragment, useMemo, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import Button from '@/components/ui/Button'
import { Card, EmptyState, ErrorState, LoadingRows } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import RowActions from '@/components/ui/RowActions'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { SUB_L, SUB_R, TD, TD_R, TH, TH_R } from '@/components/ui/table'
import { formatRupiah } from '@/lib/format'
import { titleCase } from '@/lib/text'
import { groupByMonth } from '@/lib/grouping'
import { useAuth } from '@/auth/AuthProvider'
import { usePayroll, useDeletePayroll } from '@/features/payroll/api'
import PayrollModal from '@/features/payroll/PayrollModal'
import type { PayrollView } from '@/lib/db'

const WEEK_ORDER = ['pertama', 'kedua', 'ketiga', 'keempat', 'kelima']
const weekRank = (label: string | null) => {
  const l = (label ?? '').toLowerCase()
  const i = WEEK_ORDER.findIndex((w) => l.includes(w))
  return i < 0 ? 99 : i
}
// Row label under an employee: the (title-cased) week, or a monthly-salary tag.
const weekLabel = (r: PayrollView) =>
  r.period_label ? titleCase(r.period_label) : r.salary_type === 'Harian' ? '—' : 'Gaji Bulanan'

export default function Gaji() {
  const { isAdminOrSuper } = useAuth()
  const payroll = usePayroll()
  const del = useDeletePayroll()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PayrollView | null>(null)
  const [toDelete, setToDelete] = useState<PayrollView | null>(null)

  const groups = useMemo(() => groupByMonth(payroll.data ?? [], (r) => r.month_key), [payroll.data])

  const openAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (p: PayrollView) => {
    setEditing(p)
    setModalOpen(true)
  }

  const statusLabel = (s: string) => (s === 'Dibayar' ? 'Dibayar' : 'Belum Bayar')

  return (
    <>
      <PageHeader
        title="Gaji Karyawan"
        subtitle="Karyawan harian dihitung dari hari kerja; karyawan bulanan gaji tetap."
        actions={<Button onClick={openAdd}>+ Gaji</Button>}
      />

      {payroll.isLoading ? (
        <LoadingRows />
      ) : payroll.error ? (
        <ErrorState message={(payroll.error as Error).message} />
      ) : groups.length === 0 ? (
        <Card>
          <EmptyState message="Belum ada data gaji. Tambah lewat tombol + Gaji." />
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const subBeban = g.rows.reduce((t, r) => t + r.total_beban, 0)
            const subThp = g.rows.reduce((t, r) => t + r.take_home, 0)

            // Group entries by employee so each name appears once, with its
            // weeks (Minggu Pertama, Kedua, …) listed underneath.
            const byEmp = new Map<string, PayrollView[]>()
            for (const r of g.rows) {
              const arr = byEmp.get(r.employee_id) ?? []
              arr.push(r)
              byEmp.set(r.employee_id, arr)
            }
            const employees = [...byEmp.values()].sort((a, b) =>
              a[0].employee_name.localeCompare(b[0].employee_name),
            )
            const cols = isAdminOrSuper ? 11 : 10

            return (
              <Card key={g.key} title={g.label} subtitle={`${g.rows.length} entri gaji`} bodyClassName="">
                <div className="cb-scroll overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className={TH}>Karyawan / Minggu</th>
                        <th className={TH_R}>Upah / Hari</th>
                        <th className={TH_R}>Hari Kerja</th>
                        <th className={TH_R}>Gaji Dasar</th>
                        <th className={TH_R}>Tunjangan</th>
                        <th className={TH_R}>Bonus / Lembur</th>
                        <th className={TH_R}>Potongan</th>
                        <th className={TH_R}>Total Beban</th>
                        <th className={TH_R}>Take Home Pay</th>
                        <th className={TH}>Status</th>
                        {isAdminOrSuper && <th className={TH_R}>Aksi</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((rows) => {
                        const first = rows[0]
                        const weeks = [...rows].sort(
                          (a, b) => weekRank(a.period_label) - weekRank(b.period_label),
                        )
                        return (
                          <Fragment key={first.employee_id}>
                            <tr>
                              <td colSpan={cols} className="border-t border-[#F1EBE2] bg-[#F1F6F2] px-3 py-2">
                                <span className="text-[13px] font-extrabold text-ink">{titleCase(first.employee_name)}</span>
                                <span className="ml-2 align-middle">
                                  <StatusBadge status={first.salary_type} />
                                </span>
                              </td>
                            </tr>
                            {weeks.map((r) => {
                              const rh = r.salary_type === 'Harian'
                              return (
                                <tr key={r.id}>
                                  <td className={TD + ' pl-6 font-semibold text-ink-body'}>{weekLabel(r)}</td>
                                  <td className={TD_R}>{rh ? formatRupiah(r.daily_wage) : '—'}</td>
                                  <td className={TD_R}>{rh ? r.days_worked : '—'}</td>
                                  <td className={TD_R}>{formatRupiah(r.base_pay)}</td>
                                  <td className={TD_R}>{formatRupiah(r.allowance)}</td>
                                  <td className={TD_R}>{formatRupiah(r.bonus)}</td>
                                  <td className={TD_R}>{formatRupiah(r.deduction)}</td>
                                  <td className={TD_R + ' font-extrabold text-ink'}>{formatRupiah(r.total_beban)}</td>
                                  <td className={TD_R + ' font-extrabold text-ok'}>{formatRupiah(r.take_home)}</td>
                                  <td className={TD}>
                                    <StatusBadge status={statusLabel(r.status)} />
                                  </td>
                                  {isAdminOrSuper && (
                                    <td className={TD_R}>
                                      <RowActions onEdit={() => openEdit(r)} onDelete={() => setToDelete(r)} />
                                    </td>
                                  )}
                                </tr>
                              )
                            })}
                          </Fragment>
                        )
                      })}
                      <tr>
                        <td className={SUB_L} colSpan={7}>
                          Subtotal {g.label}
                        </td>
                        <td className={SUB_R}>{formatRupiah(subBeban)}</td>
                        <td className={SUB_R}>{formatRupiah(subThp)}</td>
                        <td className={SUB_R} colSpan={isAdminOrSuper ? 2 : 1} />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <PayrollModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />

      <ConfirmDialog
        open={!!toDelete}
        message={`Hapus data gaji "${toDelete?.employee_name}" (${toDelete?.period_label ?? toDelete?.month_key})?`}
        busy={del.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      />
    </>
  )
}
