import { useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'

/**
 * Login screen with two distinct layouts:
 *  - Mobile (< md): dedicated app-like layout — real logo mark + wordmark on a
 *    green gradient at the top, login card below. The logo is a DOM element so
 *    it never gets cropped like a background image would on tall screens.
 *  - Desktop (>= md): full-bleed photo background with the card centered.
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

  const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,59,0.55)' }

  const form = (
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
      <h1 className="text-[22px] font-extrabold text-white">Login</h1>
      <p className="mb-5 mt-1 text-[12px] text-side-inactive">Catering Berkah 1121 · Platform Operasi</p>

      <label className="mb-1.5 block text-[13px] font-bold text-gold">ID Pengguna</label>
      <input
        value={id}
        onChange={(e) => setId(e.target.value)}
        autoComplete="username"
        className="mb-4 h-12 w-full rounded-xl px-3.5 text-[16px] text-white outline-none focus:ring-2 focus:ring-gold/40"
        style={inputStyle}
      />

      <label className="mb-1.5 block text-[13px] font-bold text-gold">Password</label>
      <div className="relative mb-2">
        <input
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          type={show ? 'text' : 'password'}
          autoComplete="current-password"
          className="h-12 w-full rounded-xl px-3.5 pr-11 text-[16px] text-white outline-none focus:ring-2 focus:ring-gold/40"
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
        {busy ? 'Memproses…' : 'Masuk'}
      </button>
    </form>
  )

  return (
    <div className="fixed inset-0 animate-fadeIn overflow-y-auto bg-brand-sidebar">
      {/* Desktop: photo background */}
      <div
        className="pointer-events-none absolute inset-0 hidden bg-cover bg-center md:block"
        style={{
          backgroundImage:
            'linear-gradient(rgba(9,30,20,0.45), rgba(9,30,20,0.65)), url(/assets/login-bg.png)',
        }}
      />
      {/* Mobile: green gradient background */}
      <div
        className="pointer-events-none absolute inset-0 md:hidden"
        style={{ background: 'radial-gradient(125% 80% at 50% 0%, #1B4E36 0%, #10362A 46%, #0A2419 100%)' }}
      />

      {/* ---------- Mobile layout: logo header + card ---------- */}
      <div className="relative flex min-h-full flex-col md:hidden">
        <div
          className="flex flex-col items-center px-6 text-center"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 64px)' }}
        >
          <img src="/assets/app-icon-white.png" alt="" width={92} height={92} className="drop-shadow-lg" />
          <div className="mt-4 text-[24px] font-extrabold leading-tight text-white">Catering Berkah 1121</div>
          <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-gold/80">
            For Your Every Moment
          </div>
        </div>
        <div
          className="flex flex-1 items-center justify-center px-5 pt-8"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
        >
          {form}
        </div>
      </div>

      {/* ---------- Desktop layout: card centered over photo ---------- */}
      <div className="relative hidden min-h-full items-center justify-center p-4 md:flex">{form}</div>
    </div>
  )
}
