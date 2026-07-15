import { useEffect, useRef, useState } from 'react'

// Length of the crossfade where the end of the clip dissolves into its start.
const FADE = 0.9 // seconds

/**
 * Seamless one-directional looping background video.
 *
 * The clip always plays forward, so the motion flows continuously (no boomerang
 * bounce that reads as a "replay"). To hide the restart, two stacked copies
 * crossfade at the loop point: as the active copy nears its end, the other copy
 * starts from the top and we fade across over FADE seconds. Both copies are
 * moving in the same (forward) direction during the blend, so it flows smoothly,
 * and fading the incoming copy up from opacity 0 masks any not-yet-painted frame
 * — so there is no black flash.
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
