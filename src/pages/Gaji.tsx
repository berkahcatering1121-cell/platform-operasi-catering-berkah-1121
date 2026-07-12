import { useMemo, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import Button from '@/components/ui/Button'
import { Card, EmptyState, ErrorState, LoadingRows } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import RowActions from '@/components/ui/RowActions'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { SUB_L, SUB_R, TD, TD_R, TH, TH_R } from '@/components/ui/table'
import { formatRupiah } from '@/lib/format'
import { groupByMonth } from '@/lib/grouping'
import { useAuth } from '@/auth/AuthProvider'
import { usePayroll, useDeletePayroll } from '@/features/payroll/api'
import PayrollModal from '@/features/payroll/PayrollModal'
import type { PayrollView } from '@/lib/db'

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
            return (
              <Card key={g.key} title={g.label} subtitle={`${g.rows.length} entri gaji`} bodyClassName="">
                <div className="cb-scroll overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className={TH}>Karyawan</th>
                        <th className={TH}>Tipe Gaji</th>
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
                      {g.rows.map((r) => {
                        const harian = r.salary_type === 'Harian'
                        return (
                          <tr key={r.id}>
                            <td className={TD}>
                              <div className="font-bold text-ink">{r.employee_name}</div>
                              {r.period_label && (
                                <div className="text-[11px] text-ink-faint">{r.period_label}</div>
                              )}
                            </td>
                            <td className={TD}>
                              <StatusBadge status={r.salary_type} />
                            </td>
                            <td className={TD_R}>{harian ? formatRupiah(r.daily_wage) : '—'}</td>
                            <td className={TD_R}>{harian ? r.days_worked : '—'}</td>
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
                      <tr>
                        <td className={SUB_L} colSpan={8}>
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
