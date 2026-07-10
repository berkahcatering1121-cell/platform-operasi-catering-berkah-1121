interface SplashProps {
  leaving: boolean
}

/**
 * Pre-login brand splash: radial green gradient, pulsing gold ring behind the
 * app icon, title with gold "1121", italic tagline, and a gold progress bar.
 * Auto-dismiss + fade-out are driven by the parent (App).
 */
export default function Splash({ leaving }: SplashProps) {
  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center ${
        leaving ? 'animate-cbFadeOut' : ''
      }`}
      style={{
        background:
          'radial-gradient(120% 120% at 50% 30%, #1B5138 0%, #10362A 55%, #0C2A20 100%)',
      }}
    >
      <div className="relative flex items-center justify-center">
        <span
          className="absolute rounded-full animate-cbRing"
          style={{
            width: 210,
            height: 210,
            background:
              'radial-gradient(circle, rgba(201,169,59,0.35) 0%, rgba(201,169,59,0) 70%)',
            boxShadow: '0 0 0 2px rgba(201,169,59,0.35)',
          }}
        />
        <img
          src="/assets/app-icon-white.png"
          alt="Catering Berkah"
          width={168}
          height={168}
          className="relative"
          style={{ filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.35))' }}
        />
      </div>

      <div className="mt-1 text-center animate-cbFadeUp">
        <div className="text-[26px] font-extrabold tracking-tight text-white">
          Catering Berkah <span className="text-gold">1121</span>
        </div>
        <div className="mt-[7px] text-[12px] font-semibold italic tracking-[0.04em] text-side-inactive">
          for your every moment
        </div>
      </div>

      <div
        className="mt-[22px] h-1 w-[180px] overflow-hidden rounded-pill"
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
