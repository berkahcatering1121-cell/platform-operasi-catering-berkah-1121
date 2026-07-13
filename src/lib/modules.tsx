import type { ReactNode } from 'react'

// The 11 modules. `key` is the module permission key (also used in RLS),
// `path` is the route, `code` is the 2-letter sidebar badge.
export type ModuleKey =
  | 'dashboard'
  | 'master'
  | 'pembelian'
  | 'penjualan'
  | 'gaji'
  | 'operasional'
  | 'hutang'
  | 'petty'
  | 'aset'
  | 'pnl'
  | 'pengguna'

export interface ModuleDef {
  key: ModuleKey
  label: string
  code: string
  path: string
  icon: ReactNode
}

const svg = (children: ReactNode): ReactNode => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
)

export const MODULES: ModuleDef[] = [
  { key: 'dashboard', label: 'Dashboard', code: 'DA', path: '/dashboard',
    icon: svg(<><path d="M3 3h7v7H3zM14 3h7v4h-7zM14 10h7v11h-7zM3 14h7v7H3z" /></>) },
  { key: 'master', label: 'Master Data', code: 'MD', path: '/master',
    icon: svg(<><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>) },
  { key: 'pembelian', label: 'Pembelian Bahan Baku', code: 'PB', path: '/pembelian',
    icon: svg(<><path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 7H6" /><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /></>) },
  { key: 'penjualan', label: 'Penjualan', code: 'PJ', path: '/penjualan',
    icon: svg(<><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7-7A2 2 0 0 1 3 12.2V4a1 1 0 0 1 1-1h8.2a2 2 0 0 1 1.4.6l7 7a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1.3" /></>) },
  { key: 'gaji', label: 'Gaji Karyawan', code: 'GJ', path: '/gaji',
    icon: svg(<><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6 9v6M18 9v6" /></>) },
  { key: 'operasional', label: 'Biaya Operasional', code: 'OP', path: '/operasional',
    icon: svg(<><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" /><path d="M2 14h4M10 8h4M18 16h4" /></>) },
  { key: 'hutang', label: 'Hutang', code: 'HT', path: '/hutang',
    icon: svg(<><path d="M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" /><path d="M3 10h18" /><path d="M7 15h4" /></>) },
  { key: 'petty', label: 'Petty Cash', code: 'PC', path: '/petty',
    icon: svg(<><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v5c0 1.7 3.1 3 7 3s7-1.3 7-3V6" /><path d="M5 11v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" /></>) },
  { key: 'aset', label: 'Aset & Depresiasi', code: 'AS', path: '/aset',
    icon: svg(<><path d="m12 2 8 4.5v9L12 20l-8-4.5v-9L12 2Z" /><path d="m4 6.5 8 4.5 8-4.5M12 11v9" /></>) },
  { key: 'pnl', label: 'P&L (Laba Rugi)', code: 'PL', path: '/pnl',
    icon: svg(<><path d="M4 20h16" /><rect x="6" y="11" width="3" height="6" /><rect x="11" y="7" width="3" height="10" /><rect x="16" y="13" width="3" height="4" /></>) },
  { key: 'pengguna', label: 'Manajemen Pengguna', code: 'US', path: '/pengguna',
    icon: svg(<><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5.5a3 3 0 0 1 0 5M17 20a6 6 0 0 0-2-4.5" /></>) },
]

export const MODULE_BY_KEY = Object.fromEntries(MODULES.map((m) => [m.key, m])) as Record<
  ModuleKey,
  ModuleDef
>

// Sidebar nav grouped into sections. `title: null` = no header (top/bottom).
export const NAV_GROUPS: { title: string | null; keys: ModuleKey[] }[] = [
  { title: null, keys: ['dashboard', 'master'] },
  { title: 'Operasional', keys: ['pembelian', 'penjualan', 'petty', 'operasional'] },
  { title: 'Finance', keys: ['gaji', 'hutang', 'aset', 'pnl'] },
  { title: null, keys: ['pengguna'] },
]
