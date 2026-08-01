import { useEffect, useRef, useState } from 'react'

interface Props {
  /** Target value to animate to. */
  to: number
  /** Formats the (animating) number for display, e.g. formatRupiah / formatPercent. */
  format: (n: number) => string
  /** Animation duration in ms. */
  duration?: number
}

const prefersReduced =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Smoothly counts from the previous value up to `to` (easeOutCubic) whenever the
 * target changes — a classy touch for KPI figures. Falls back to the final value
 * instantly when the user prefers reduced motion.
 */
export default function CountUp({ to, format, duration = 900 }: Props) {
  const [display, setDisplay] = useState(to)
  const fromRef = useRef(0)
  const rafRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (prefersReduced) {
      setDisplay(to)
      fromRef.current = to
      return
    }
    const from = fromRef.current
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(from + (to - from) * eased)
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = to
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      fromRef.current = to // if interrupted, next run starts from the target
    }
  }, [to, duration])

  return <>{format(display)}</>
}
