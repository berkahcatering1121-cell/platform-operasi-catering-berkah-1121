import { useEffect, useRef, useState } from 'react'

// Length of the crossfade at the loop point. Short + on a boomerang source
// (near-identical frames at the seam) = a very soft, barely-there blend.
const FADE = 0.7 // seconds

/**
 * Seamless looping background video — a soft blend, never a black flash.
 *
 * The source is a *boomerang* clip (forward, then the same footage reversed), so
 * the frames at the loop point are nearly identical. Two stacked copies crossfade
 * there: because the seam frames match, the blend is extremely subtle, and
 * fading the incoming copy up from opacity 0 hides any not-yet-painted frame, so
 * there is no black blink. The result is one continuous, softly-looping motion.
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

    vids[0].play().catch(() => {})

    const tick = () => {
      const a = vids[cur]
      const b = vids[cur ^ 1]
      if (a && b && a.duration && a.currentTime >= a.duration - FADE) {
        // Start the other copy from the top and crossfade over to it.
        b.currentTime = 0
        b.play().catch(() => {})
        const prev = cur
        cur ^= 1
        setActive(cur)
        // Rewind/park the copy we faded out, off-screen, once the blend is done.
        window.setTimeout(() => vids[prev]?.pause(), FADE * 1000 + 150)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const cls = 'absolute inset-0 h-full w-full object-cover transition-opacity ease-linear'
  const base = { transitionDuration: `${FADE}s`, backgroundColor: '#10362A' }

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
