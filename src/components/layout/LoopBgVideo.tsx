/**
 * Seamless looping background video.
 *
 * The source is a *boomerang* clip (plays forward, then the exact same footage
 * in reverse). Its first and last frames are the same image, so the native
 * `loop` restart is pixel-continuous — no black flash, no crossfade blend, just
 * one uninterrupted motion that never appears to restart.
 *
 * Muted + playsInline so autoplay is permitted on every browser (incl. iOS).
 */
export default function LoopBgVideo({ src }: { src: string }) {
  return (
    <video
      className="absolute inset-0 h-full w-full object-cover"
      style={{ backgroundColor: '#10362A' }}
      muted
      playsInline
      autoPlay
      loop
      preload="auto"
    >
      <source src={src} type="video/mp4" />
    </video>
  )
}
