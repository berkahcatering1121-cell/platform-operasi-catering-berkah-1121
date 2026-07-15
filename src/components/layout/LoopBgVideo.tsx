import { useEffect, useRef, useState } from 'react'

// Start the standby copy this many seconds before the loop point, while it is
// still hidden, so it is actually decoding/painting by the time we reveal it.
const LEAD = 0.4
// Reveal the standby at the exact crossing point (LEAD/2): because the boomerang
// is time-symmetric around the loop point, the outgoing (reversing) copy and the
// incoming (forward) copy show the *same* frame there — so the hard cut has no
// black blink (standby already painted) and no positional jump (frames match).
const REVEAL_DELAY = (LEAD / 2) * 1000 // ms

/**
 * Truly seamless looping background video — no black flash, no blend.
 *
 * The source is a *boomerang* clip (forward, then the same footage reversed), so
 * its first and last frames are identical AND the footage is time-symmetric
 * around the loop point. We double-buffer two copies and hand off like this:
 *
 *   1. A short moment (LEAD) before the active copy ends, we start the standby
 *      copy from frame 0 while it is still hidden — it begins decoding/painting.
 *   2. After REVEAL_DELAY we hard-cut (instant opacity flip) to the standby.
 *      Because the boomerang is symmetric around the loop point, both copies are
 *      showing the same frame during this overlap, so the cut is invisible — and
 *      the standby is already painted, so there is no black blink.
 *   3. The copy we left finishes off-screen, then rewinds to frame 0 to re-arm.
 *
 * Muted + playsInline so autoplay is allowed everywhere (incl. iOS Safari).
 */
export default function LoopBgVideo({ src }: { src: string }) {
  const v0 = useRef<HTMLVideoElement>(null)
  const v1 = useRef<HTMLVideoElement>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const vids = [v0.current, v1.current]
    if (!vids[0] || !vids[1]) return
    let cur = 0
    let raf = 0
    let swapping = false

    vids[0].play().catch(() => {})
    vids[1].pause()
    try {
      vids[1].currentTime = 0
    } catch {
      /* not seekable yet */
    }

    const tick = () => {
      const a = vids[cur]
      const b = vids[cur ^ 1]
      if (a && b && !swapping && a.duration && a.currentTime >= a.duration - LEAD) {
        swapping = true
        const prev = cur
        // 1) Start the standby copy from the top while still hidden.
        b.currentTime = 0
        b.play().catch(() => {})
        // 2) Reveal it once it has painted a few frames — invisible hard cut.
        window.setTimeout(() => {
          cur ^= 1
          setActive(cur)
        }, REVEAL_DELAY)
        // 3) Re-arm the copy we left, off-screen, after it has fully ended.
        window.setTimeout(() => {
          const p = vids[prev]
          if (p) {
            p.pause()
            try {
              p.currentTime = 0
            } catch {
              /* ignore */
            }
          }
          swapping = false
        }, LEAD * 1000 + 150)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // No CSS transition — the swap is a hard cut between identical frames.
  const cls = 'absolute inset-0 h-full w-full object-cover'
  const base = { backgroundColor: '#10362A' as const }

  return (
    <>
      <video ref={v0} className={cls} style={{ ...base, opacity: active === 0 ? 1 : 0 }} muted playsInline autoPlay preload="auto">
        <source src={src} type="video/mp4" />
      </video>
      <video ref={v1} className={cls} style={{ ...base, opacity: active === 1 ? 1 : 0 }} muted playsInline preload="auto">
        <source src={src} type="video/mp4" />
      </video>
    </>
  )
}
