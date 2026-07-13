import { useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { supabase } from '@/lib/supabase'

/**
 * Forced first-login screen: shown while the signed-in user still has
 * `must_change_password = true`. They set their own password via the
 * admin-users edge function (changeOwnPassword), which updates auth,
 * clears the flag, and records the new password for the Super Admin.
 */
export default function ChangePassword() {
  const { profile, signOut, refreshProfile } = useAuth()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (pw.length < 6) return setError('Password minimal 6 karakter.')
    if (pw !== pw2) return setError('Konfirmasi password tidak sama.')
    setBusy(true)
    setError(null)
    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'changeOwnPassword', password: pw },
    })
    if (error || (data && data.error)) {
      let msg = data?.error ?? error?.message ?? 'Gagal menyimpan password.'
      try {
        const ctx = (error as unknown as { context?: Response })?.context
        if (ctx) {
          const parsed = await ctx.json()
          if (parsed?.error) msg = parsed.error
        }
      } catch {
        /* keep default */
      }
      setError(msg)
      setBusy(false)
      return
    }
    // Flag is cleared server-side — refresh the profile so the app proceeds.
    await refreshProfile()
    setBusy(false)
  }

  const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,59,0.55)' }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 animate-fadeIn"
      style={{
        background:
          'linear-gradient(rgba(9,30,20,0.45), rgba(9,30,20,0.65)), url(/assets/login-bg.png) left center / cover no-repeat, #10362A',
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-[380px] rounded-[18px] p-6"
        style={{
          background: 'linear-gradient(150deg, rgba(20,55,40,0.72), rgba(9,30,20,0.82))',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(201,169,59,0.55)',
          boxShadow: '0 24px 80px rgba(6,20,12,0.6)',
        }}
      >
        <h1 className="text-[22px] font-extrabold text-white">Buat Password Baru</h1>
        <p className="mb-5 mt-1 text-[12px] leading-relaxed text-side-inactive">
          Halo <b className="text-gold-pale">{profile?.full_name}</b>, demi keamanan silakan ganti password
          sementara Anda dengan password pilihan sendiri sebelum melanjutkan.
        </p>

        <label className="mb-1.5 block text-[13px] font-bold text-gold">Password Baru</label>
        <div className="relative mb-4">
          <input
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            type={show ? 'text' : 'password'}
            autoFocus
            autoComplete="new-password"
            placeholder="Minimal 6 Karakter"
            className="h-12 w-full rounded-xl px-3.5 pr-11 text-[14px] text-white outline-none placeholder:text-white/35 focus:ring-2 focus:ring-gold/40"
            style={inputStyle}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gold hover:text-gold-light"
          >
            {show ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" />
                <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
              </svg>
            )}
          </button>
        </div>

        <label className="mb-1.5 block text-[13px] font-bold text-gold">Ulangi Password Baru</label>
        <input
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="Ketik Ulang Password"
          className="mb-2 h-12 w-full rounded-xl px-3.5 text-[14px] text-white outline-none placeholder:text-white/35 focus:ring-2 focus:ring-gold/40"
          style={inputStyle}
        />

        {error && (
          <div
            className="mb-2 mt-3 rounded-xl px-3 py-2 text-[12.5px] font-medium text-white"
            style={{ background: 'rgba(179,38,30,0.25)', border: '1px solid rgba(245,198,189,0.4)' }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-5 h-12 w-full rounded-xl text-[15px] font-extrabold text-[#1A2A1F] transition-colors disabled:opacity-70"
          style={{ background: '#C9A93B', boxShadow: '0 6px 20px rgba(201,154,59,0.4)' }}
        >
          {busy ? 'Menyimpan…' : 'Simpan & Lanjutkan'}
        </button>

        <button
          type="button"
          onClick={() => signOut()}
          className="mt-3 h-10 w-full rounded-xl text-[13px] font-semibold text-side-inactive hover:text-white"
        >
          Keluar
        </button>
      </form>
    </div>
  )
}
