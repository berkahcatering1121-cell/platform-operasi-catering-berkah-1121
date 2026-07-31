interface SplashProps {
  leaving: boolean
}

/**
 * Boot splash — matches the login screen: the same futuristic background (dark
 * food photo + drifting gold tech grid + sweeping gold scan line + vignette),
 * with the brand mark, wordmark (gold "1121" + shine) and a glowing progress
 * bar centered on top. Auto-dismiss + fade-out are driven by the parent (App).
 */
export default function Splash({ leaving }: SplashProps) {
  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden ${
        leaving ? 'animate-cbFadeOut' : ''
      }`}
    >
      {/* Same futuristic background as the login page */}
      <div className="login-fx absolute inset-0">
        <span className="login-fx__scan" />
        <div className="login-fx__vignette" />
      </div>

      {/* Brand mark with a soft breathing gold halo */}
      <div className="relative mb-5 flex items-center justify-center">
        <span className="splash__halo" aria-hidden />
        <img
          src="/assets/app-icon-white.png"
          alt="Catering Berkah"
          width={128}
          height={128}
          className="relative"
          style={{ filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.45))' }}
        />
      </div>

      <div className="relative text-center animate-cbFadeUp">
        <div className="splash__wordmark text-[26px] font-extrabold tracking-tight text-white">
          Catering Berkah <span className="splash__accent text-gold">1121</span>
          <span className="splash__wordmark-shine" aria-hidden>
            Catering Berkah 1121
          </span>
        </div>
        <div className="mt-[7px] text-[11px] font-bold uppercase tracking-[0.28em] text-gold/70">
          For Your Every Moment
        </div>
      </div>

      {/* Glowing progress bar */}
      <div className="relative mt-[22px]">
        <div className="splash__bar">
          <div className="splash__bar-fill" />
          <div className="splash__bar-shine" />
        </div>
      </div>
    </div>
  )
}
