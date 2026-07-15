import { useEffect, useRef, useState } from 'react'

// Swap this many seconds before the end. The incoming copy is already decoded
// and parked on frame 0, so the hand-off is instant.
const SWAP = 0.09 // ~2 frames at 25fps

/**
 * Truly seamless looping background video — no black flash, no blend.
 *
 * The source is a *boomerang* clip (plays forward, then the same footage in
 * reverse), so its first and last frames are the same image. Instead of relying
 * on the browser's native `loop` — which briefly shows a black frame while the
 * decoder reseeks to the start — we double-buffer: two stacked copies, and at
 * the loop point we HARD-CUT (instant opacity swap, no transition) to the other
 * copy, which is already playing fresh from frame 0. Because both copies show
 * the identical boomerang frame at the cut, the swap is invisible, and the
 * incoming copy never reseeks on-screen, so there is no black flash at all.
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

    // Start the first copy; keep the second parked on frame 0, decoded & ready.
    vids[0].play().catch(() => {})
    vids[1].pause()
    try {
      vids[1].currentTime = 0
    } catch {
      /* not seekable yet — will settle once metadata loads */
    }

    const tick = () => {
      const a = vids[cur]
      const b = vids[cur ^ 1]
      if (a && b && !swapping && a.duration && a.currentTime >= a.duration - SWAP) {
        swapping = true
        // Hand off to the standby copy (already on frame 0) with an instant cut.
        b.play().catch(() => {})
        const prev = cur
        cur ^= 1
        setActive(cur)
        // Re-arm the copy we just left: rewind (off-screen) so it's ready next time.
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
        }, 120)
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
