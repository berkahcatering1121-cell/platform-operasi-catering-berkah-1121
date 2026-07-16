import { useEffect, useState } from 'react'
import { titleCase } from '@/lib/text'

interface WelcomeScreenProps {
  name: string
  role?: string
  /** Called once the greeting has been shown and faded out. */
  onDone: () => void
}

// Time-of-day greeting (WIB / device local time).
function greeting(): string {
  const h = new Date().getHours()
  if (h < 11) return 'Selamat Pagi'
  if (h < 15) return 'Selamat Siang'
  if (h < 19) return 'Selamat Sore'
  return 'Selamat Malam'
}

const HOLD = 2600 // ms the greeting stays fully visible
const FADE = 700 // ms fade-out before entering the app

/**
 * Post-login welcome. Greets the signed-in user by name for a few seconds, then
 * fades out and hands control back to the app. Brand-matched with the boot
 * splash (deep-green radial, gold accent) for a cohesive feel.
 */
export default function WelcomeScreen({ name, role, onDone }: WelcomeScreenProps) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const t1 = window.setTimeout(() => setLeaving(true), HOLD)
    const t2 = window.setTimeout(onDone, HOLD + FADE)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [onDone])

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center px-8 text-center ${
        leaving ? 'animate-cbFadeOut' : ''
      }`}
      style={{
        background: 'radial-gradient(120% 120% at 50% 30%, #1B5138 0%, #10362A 55%, #0C2A20 100%)',
      }}
    >
      {/* App mark with a soft pulsing gold halo */}
      <div className="relative mb-6 flex items-center justify-center">
        <span
          className="absolute rounded-full animate-cbRing"
          style={{
            width: 148,
            height: 148,
            background: 'radial-gradient(circle, rgba(201,169,59,0.32) 0%, rgba(201,169,59,0) 70%)',
            boxShadow: '0 0 0 2px rgba(201,169,59,0.30)',
          }}
        />
        <img
          src="/assets/app-icon-white.png"
          alt="Catering Berkah"
          width={104}
          height={104}
          className="relative"
          style={{ filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.35))' }}
        />
      </div>

      <div className="animate-cbFadeUp">
        <div className="text-[13px] font-semibold tracking-[0.14em] text-side-inactive uppercase">
          {greeting()}
        </div>
        <div className="mt-2 text-[28px] font-extrabold leading-tight tracking-tight text-white">
          Hi, <span className="text-gold">{titleCase(name)}</span> 👋
        </div>
        {role && (
          <div className="mt-2 text-[12.5px] font-medium text-side-inactive">
            {role} · Catering Berkah 1121
          </div>
        )}
        <div className="mt-5 text-[12px] italic text-side-inactive/80">
          Menyiapkan halaman Anda…
        </div>
      </div>

      {/* Slim indeterminate progress accent */}
      <div
        className="mt-6 h-1 w-[160px] overflow-hidden rounded-pill"
        style={{ background: 'rgba(255,255,255,0.12)' }}
      >
        <div
          className="h-full animate-cbBarFill rounded-pill"
          style={{ background: 'linear-gradient(90deg, #C9A93B, #E2C77E)' }}
        />
      </div>
    </div>
  )
}
