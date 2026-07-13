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
import PnL from '@/pages/PnL'
import Pengguna from '@/pages/Pengguna'

export default function App() {
  const { loading, session, profile } = useAuth()

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
  // First-login: force the user to replace their temporary password.
  if (profile?.must_change_password) return <ChangePassword />

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/master" element={<RequireModule module="master"><MasterData /></RequireModule>} />
        <Route path="/pembelian" element={<RequireModule module="pembelian"><Pembelian /></RequireModule>} />
        <Route path="/penjualan" element={<RequireModule module="penjualan"><Penjualan /></RequireModule>} />
        <Route path="/gaji" element={<RequireModule module="gaji"><Gaji /></RequireModule>} />
        <Route path="/operasional" element={<RequireModule module="operasional"><Operasional /></RequireModule>} />
        <Route path="/hutang" element={<RequireModule module="hutang"><Hutang /></RequireModule>} />
        <Route path="/petty" element={<RequireModule module="petty"><PettyCash /></RequireModule>} />
        <Route path="/aset" element={<RequireModule module="aset"><Aset /></RequireModule>} />
        <Route path="/pnl" element={<PnL />} />
        <Route path="/pengguna" element={<RequireModule module="pengguna"><Pengguna /></RequireModule>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
