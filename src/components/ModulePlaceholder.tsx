import PageHeader from './PageHeader'

interface Props {
  title: string
  subtitle: string
}

/**
 * Temporary scaffold for modules not yet built out. The route, permission
 * gating, and layout are wired; the module UI lands in the next phase.
 */
export default function ModulePlaceholder({ title, subtitle }: Props) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="cb-card flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-app-panel text-gold">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
          </svg>
        </span>
        <div className="text-[14px] font-extrabold text-ink">Modul sedang disiapkan</div>
        <p className="max-w-sm text-[12.5px] text-ink-muted">
          Fondasi (skema database, RLS, autentikasi, dan layout) sudah terpasang.
          Konten modul ini dibangun pada tahap berikutnya.
        </p>
      </div>
    </>
  )
}
