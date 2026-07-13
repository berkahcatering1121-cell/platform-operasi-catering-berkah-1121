import { useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'

/**
 * Login screen: full-bleed background, frosted gold-bordered card, ID Pengguna
 * + Password (with show/hide eye toggle), inline error, gold "Masuk" button.
 * Uses real Supabase Auth via AuthProvider.signIn.
 */
export default function Login() {
  const { signIn } = useAuth()
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    const { error } = await signIn(id, pw)
    if (error) {
      setError(error)
      setPw('')
    }
    setBusy(false)
  }

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
        className="w-full max-w-[360px] rounded-[18px] p-6"
        style={{
          background: 'linear-gradient(150deg, rgba(20,55,40,0.72), rgba(9,30,20,0.82))',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(201,169,59,0.55)',
          boxShadow: '0 24px 80px rgba(6,20,12,0.6)',
        }}
      >
        <h1 className="text-[22px] font-extrabold text-white">Login</h1>
        <p className="mb-5 mt-1 text-[12px] text-side-inactive">Catering Berkah 1121 · Platform Operasi</p>

        <label className="mb-1.5 block text-[13px] font-bold text-gold">ID Pengguna</label>
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          autoFocus
          autoComplete="username"
          className="mb-4 h-12 w-full rounded-xl px-3.5 text-[14px] text-white outline-none focus:ring-2 focus:ring-gold/40"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,59,0.55)' }}
        />

        <label className="mb-1.5 block text-[13px] font-bold text-gold">Password</label>
        <div className="relative mb-2">
          <input
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            className="h-12 w-full rounded-xl px-3.5 pr-11 text-[14px] text-white outline-none focus:ring-2 focus:ring-gold/40"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,59,0.55)' }}
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

        {error && (
          <div className="mb-2 mt-3 rounded-xl px-3 py-2 text-[12.5px] font-medium text-white"
            style={{ background: 'rgba(179,38,30,0.25)', border: '1px solid rgba(245,198,189,0.4)' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-5 h-12 w-full rounded-xl text-[15px] font-extrabold text-[#1A2A1F] transition-colors disabled:opacity-70"
          style={{ background: '#C9A93B', boxShadow: '0 6px 20px rgba(201,154,59,0.4)' }}
        >
          {busy ? 'Memproses…' : 'Masuk'}
        </button>
      </form>
    </div>
  )
}
