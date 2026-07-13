import { useState } from 'react'
import PageHeader from '@/components/PageHeader'
import KategoriTab from '@/features/master/KategoriTab'
import SupplierTab from '@/features/master/SupplierTab'
import KaryawanTab from '@/features/master/KaryawanTab'
import MenuTab from '@/features/master/MenuTab'

const TABS = ['Kategori & Referensi', 'Supplier', 'Karyawan', 'Menu & Harga Jual'] as const

export default function MasterData() {
  const [tab, setTab] = useState(0)

  return (
    <>
      <PageHeader
        title="Master Data"
        subtitle="Data referensi: kategori, supplier, karyawan, menu & harga jual."
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map((label, i) => (
          <button
            key={label}
            onClick={() => setTab(i)}
            className={
              tab === i
                ? 'rounded-pill bg-ink px-4 py-2 text-[12.5px] font-extrabold text-[#F3EDE3]'
                : 'rounded-pill border border-app-border bg-app-card px-4 py-2 text-[12.5px] font-bold text-ink-secondary hover:bg-app-panel'
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 0 && <KategoriTab />}
      {tab === 1 && <SupplierTab />}
      {tab === 2 && <KaryawanTab />}
      {tab === 3 && <MenuTab />}
    </>
  )
}
