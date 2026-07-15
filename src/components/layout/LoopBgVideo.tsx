import { useEffect, useRef, useState } from 'react'

const FADE = 0.7 // seconds of crossfade at the loop boundary

/**
 * Seamless looping background video. Two stacked copies crossfade at the loop
 * point so the restart is invisible (no black flash / jump). Muted + playsInline
 * so autoplay is allowed everywhere.
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
        // Start the other copy from the top and crossfade to it.
        b.currentTime = 0
        b.play().catch(() => {})
        const prev = cur
        cur ^= 1
        setActive(cur)
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
