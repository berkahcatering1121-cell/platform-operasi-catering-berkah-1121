import { useMemo, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import Button from '@/components/ui/Button'
import { Card, EmptyState, ErrorState, LoadingRows } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import RowActions from '@/components/ui/RowActions'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { SUB_L, SUB_R, TD, TD_R, TH, TH_R } from '@/components/ui/table'
import { formatDate, formatRupiah } from '@/lib/format'
import { titleCase } from '@/lib/text'
import { groupByMonth } from '@/lib/grouping'
import { useEmployees } from '@/features/master/api'
import { useSales, useDeleteSale } from '@/features/sales/api'
import SaleModal from '@/features/sales/SaleModal'
import { generateInvoicePdf, invoiceNumberFor } from '@/features/sales/invoice'
import type { SaleView } from '@/lib/db'
import { useT } from '@/lib/i18n'

export default function Penjualan() {
  const { t } = useT()
  const sales = useSales()
  const employees = useEmployees()
  const del = useDeleteSale()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SaleView | null>(null)
  const [toDelete, setToDelete] = useState<SaleView | null>(null)

  const empName = useMemo(() => {
    const m = new Map((employees.data ?? []).map((e) => [e.id, e.name]))
    return (id: string | null, fallback: string | null) =>
      id ? (m.get(id) ?? fallback ?? '') : (fallback ?? '')
  }, [employees.data])

  const groups = useMemo(() => groupByMonth(sales.data ?? [], (r) => r.month_key), [sales.data])

  const openAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (s: SaleView) => {
    setEditing(s)
    setModalOpen(true)
  }

  // Re-generate the invoice PDF for an existing sale (total = porsi x harga).
  const printInvoice = (r: SaleView) =>
    void generateInvoicePdf({
      invoiceNo: invoiceNumberFor(r.sale_date, r.customer, r.id),
      sale_date: r.sale_date,
      customer: r.customer,
      menu_name: r.menu_name,
      menu_category: r.menu_category,
      portions: r.portions,
      price_per_portion: r.price_per_portion,
      total: r.total,
      paid_amount: r.paid_amount,
      sisa: r.sisa,
      status: r.status,
      method: r.method,
      pic_name: empName(r.pic_employee_id, r.pic_name) || null,
      notes: r.notes,
    })

  return (
    <>
      <PageHeader
        title="Penjualan"
        subtitle="Pesanan customer & event; harga per porsi ditarik dari Master Data."
        actions={<Button onClick={openAdd}>{t('+ Penjualan')}</Button>}
      />

      {sales.isLoading ? (
        <LoadingRows />
      ) : sales.error ? (
        <ErrorState message={(sales.error as Error).message} />
      ) : groups.length === 0 ? (
        <Card>
          <EmptyState message="Belum ada transaksi penjualan. Tambah lewat tombol + Penjualan." />
        </Card>
      ) : (
        <div className="cb-stagger space-y-4">
          {groups.map((g) => {
            const subtotal = g.rows.reduce((t, r) => t + r.total, 0)
            const subSisa = g.rows.reduce((t, r) => t + r.sisa, 0)
            return (
              <Card key={g.key} title={g.label} subtitle={`${g.rows.length} transaksi`} bodyClassName="">
                <div className="cb-scroll overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className={TH}>Tanggal</th>
                        <th className={TH}>Customer / Event</th>
                        <th className={TH}>Menu</th>
                        <th className={TH_R}>{t('Porsi')}</th>
                        <th className={TH_R}>{t('Harga / Porsi')}</th>
                        <th className={TH_R}>{t('Total')}</th>
                        <th className={TH_R}>{t('Sisa Pembayaran')}</th>
                        <th className={TH}>Status</th>
                        <th className={TH}>PIC</th>
                        <th className={TH_R}>{t('Aksi')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((r) => (
                        <tr key={r.id}>
                          <td className={TD + ' whitespace-nowrap'}>{formatDate(r.sale_date)}</td>
                          <td className={TD + ' font-bold text-ink'}>{titleCase(r.customer)}</td>
                          <td className={TD}>
                            <div>{r.menu_name ? titleCase(r.menu_name) : '-'}</div>
                            {r.menu_category && (
                              <div className="text-[11px] text-ink-faint">{r.menu_category}</div>
                            )}
                          </td>
                          <td className={TD_R}>{r.portions}</td>
                          <td className={TD_R}>{formatRupiah(r.price_per_portion)}</td>
                          <td className={TD_R + ' font-extrabold text-ink'}>{formatRupiah(r.total)}</td>
                          <td className={TD_R}>
                            {r.status === 'Lunas' || r.sisa <= 0 ? (
                              <span className="text-ink-faint">-</span>
                            ) : (
                              <span className="font-bold text-danger">{formatRupiah(r.sisa)}</span>
                            )}
                          </td>
                          <td className={TD}>
                            <StatusBadge status={r.status} />
                          </td>
                          <td className={TD}>
                            {empName(r.pic_employee_id, r.pic_name) || <span className="text-ink-faint">-</span>}
                          </td>
                          <td className={TD_R}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => printInvoice(r)}
                                aria-label={t('Invoice')}
                                title={t('Unduh Invoice (PDF)')}
                                className="rounded-md p-1.5 text-ink-secondary transition hover:bg-app-panel hover:text-brand"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                  <path d="M14 2v6h6M9 13h6M9 17h6" />
                                </svg>
                              </button>
                              <RowActions onEdit={() => openEdit(r)} onDelete={() => setToDelete(r)} />
                            </div>
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td className={SUB_L} colSpan={5}>
                          Subtotal {g.label}
                        </td>
                        <td className={SUB_R}>{formatRupiah(subtotal)}</td>
                        <td className={SUB_R}>{subSisa > 0 ? formatRupiah(subSisa) : '-'}</td>
                        <td className={SUB_R} colSpan={3} />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <SaleModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />

      <ConfirmDialog
        open={!!toDelete}
        message={`Hapus penjualan "${toDelete?.customer}" (${toDelete ? formatDate(toDelete.sale_date) : ''})?`}
        busy={del.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      />
    </>
  )
}
