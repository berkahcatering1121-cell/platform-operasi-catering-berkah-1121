interface SplashProps {
  leaving: boolean
}

// A few gold dust motes with varied position / size / timing for organic drift.
const DUST = [
  { left: '18%', bottom: '26%', size: 3, dur: 6.5, delay: 0 },
  { left: '32%', bottom: '18%', size: 4, dur: 7.8, delay: 1.2 },
  { left: '50%', bottom: '30%', size: 2.5, dur: 6.0, delay: 2.1 },
  { left: '64%', bottom: '20%', size: 4, dur: 8.4, delay: 0.7 },
  { left: '78%', bottom: '28%', size: 3, dur: 7.0, delay: 1.7 },
  { left: '44%', bottom: '14%', size: 2.5, dur: 9.0, delay: 3.0 },
]

/**
 * Premium boot splash: a cinematic, Framer-Motion-like reveal built from pure
 * CSS — drifting ambient orbs, a breathing halo, a slowly rotating gold arc, a
 * shine sweep over the brand mark, floating gold dust, staggered fade-ups, and a
 * glowing progress bar. Auto-dismiss + fade-out are driven by the parent (App).
 */
export default function Splash({ leaving }: SplashProps) {
  return (
    <div className={`splash ${leaving ? 'splash--leaving' : ''}`}>
      {/* Ambient background light */}
      <span className="splash__orb splash__orb--gold" aria-hidden />
      <span className="splash__orb splash__orb--emerald" aria-hidden />

      {/* Floating gold dust */}
      {DUST.map((d, i) => (
        <span
          key={i}
          className="splash__dust"
          aria-hidden
          style={{
            left: d.left,
            bottom: d.bottom,
            width: d.size,
            height: d.size,
            animationDuration: `${d.dur}s`,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}

      {/* Icon stage */}
      <div className="splash__stage">
        <span className="splash__halo" aria-hidden />
        <span className="splash__ring-static" aria-hidden />
        <span className="splash__ring-spin" aria-hidden />
        <div className="splash__icon">
          <img
            src="/assets/app-icon-white.png"
            alt="Catering Berkah"
            width={168}
            height={168}
          />
        </div>
      </div>

      {/* Wordmark — a glossy shine, clipped to the letter shapes, glides across */}
      <div className="splash__title mt-1 text-center">
        <div className="splash__wordmark text-[27px] font-extrabold tracking-tight text-white">
          Catering Berkah <span className="splash__accent text-gold">1121</span>
          <span className="splash__wordmark-shine" aria-hidden>
            Catering Berkah 1121
          </span>
        </div>
      </div>
      <div className="splash__tag mt-[7px] text-[12px] font-semibold italic tracking-[0.04em] text-side-inactive">
        for your every moment
      </div>

      {/* Progress */}
      <div className="splash__barwrap mt-[22px]">
        <div className="splash__bar">
          <div className="splash__bar-fill" />
          <div className="splash__bar-shine" />
        </div>
      </div>
    </div>
  )
}
