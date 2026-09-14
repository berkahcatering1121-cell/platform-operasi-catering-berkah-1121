import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import Splash from '@/components/Splash'
import Login from '@/pages/Login'
import ChangePassword from '@/pages/ChangePassword'
import AppShell from '@/components/layout/AppShell'
import RequireModule from '@/routes/RequireModule'

import Dashboard from '@/pages/Dashboard'
import MasterData from '@/pages/MasterData'
import Pembelian from '@/pages/Pembelian'
import Penjualan from '@/pages/Penjualan'
import Gaji from '@/pages/Gaji'
import Operasional from '@/pages/Operasional'
import Hutang from '@/pages/Hutang'
import PettyCash from '@/pages/PettyCash'
import Aset from '@/pages/Aset'
import CashFlow from '@/pages/CashFlow'
import BankReconciliation from '@/pages/BankReconciliation'
import PnL from '@/pages/PnL'
import Pengguna from '@/pages/Pengguna'

export default function App() {
  const { loading, session, profile, landingPath, profileFailed, signOut } = useAuth()

  // Branded splash: show for ~2.2s, then fade out (matches prototype timing).
  const [booting, setBooting] = useState(true)
  const [splashLeaving, setSplashLeaving] = useState(false)
  useEffect(() => {
    const t1 = setTimeout(() => setSplashLeaving(true), 2200)
    const t2 = setTimeout(() => setBooting(false), 2200 + 750)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = booting || !session ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [booting, session])

  if (booting || loading) return <Splash leaving={splashLeaving} />
  if (!session) return <Login />
  // Logged in but the profile is still loading - hold on the splash so we never
  // flash the "no module" screen before we actually know the user's permissions.
  // If it genuinely failed (e.g. the phone's network can't reach the server),
  // show a retry screen instead of hanging on the splash forever.
  if (!profile) {
    if (profileFailed) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-app-bg px-6 text-center">
          <div className="text-[15px] font-extrabold text-ink">Gagal memuat data</div>
          <p className="max-w-sm text-[13px] text-ink-muted">
            Tidak dapat terhubung ke server. Periksa koneksi internet Anda (coba matikan VPN / penghemat data / pemblokir),
            lalu muat ulang.
          </p>
          <div className="mt-1 flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="rounded-btn bg-brand px-4 py-2 text-[13px] font-bold text-white transition hover:bg-brand-dark"
            >
              Muat ulang
            </button>
            <button
              onClick={() => signOut().then(() => window.location.reload())}
              className="rounded-btn border border-app-border bg-app-card px-4 py-2 text-[13px] font-bold text-ink-secondary hover:bg-app-panel"
            >
              Keluar
            </button>
          </div>
        </div>
      )
    }
    return <Splash leaving={false} />
  }
  // First-login: force the user to replace their temporary password.
  if (profile.must_change_password) return <ChangePassword />

  // A user with no accessible module at all (everything unchecked).
  if (!landingPath) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-app-bg px-6 text-center">
        <div className="text-[15px] font-extrabold text-ink">Tidak ada modul yang dapat diakses</div>
        <p className="max-w-sm text-[13px] text-ink-muted">
          Akun Anda belum diberi izin modul apa pun. Hubungi Super Admin untuk mengatur hak akses.
        </p>
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to={landingPath} replace />} />
        <Route path="/dashboard" element={<RequireModule module="dashboard"><Dashboard /></RequireModule>} />
        <Route path="/master" element={<RequireModule module="master"><MasterData /></RequireModule>} />
        <Route path="/pembelian" element={<RequireModule module="pembelian"><Pembelian /></RequireModule>} />
        <Route path="/penjualan" element={<RequireModule module="penjualan"><Penjualan /></RequireModule>} />
        <Route path="/gaji" element={<RequireModule module="gaji"><Gaji /></RequireModule>} />
        <Route path="/operasional" element={<RequireModule module="operasional"><Operasional /></RequireModule>} />
        <Route path="/hutang" element={<RequireModule module="hutang"><Hutang /></RequireModule>} />
        <Route path="/petty" element={<RequireModule module="petty"><PettyCash /></RequireModule>} />
        <Route path="/aset" element={<RequireModule module="aset"><Aset /></RequireModule>} />
        <Route path="/cashflow" element={<RequireModule module="cashflow"><CashFlow /></RequireModule>} />
        <Route path="/rekonsiliasi" element={<RequireModule module="rekonsiliasi"><BankReconciliation /></RequireModule>} />
        <Route path="/pnl" element={<RequireModule module="pnl"><PnL /></RequireModule>} />
        <Route path="/pengguna" element={<RequireModule module="pengguna"><Pengguna /></RequireModule>} />
        <Route path="*" element={<Navigate to={landingPath} replace />} />
      </Route>
    </Routes>
  )
}
