interface Props {
  onEdit?: () => void
  onDelete?: () => void
}

/** Compact Edit / Hapus icon buttons for table rows. */
export default function RowActions({ onEdit, onDelete }: Props) {
  return (
    <div className="flex items-center justify-end gap-1">
      {onEdit && (
        <button
          onClick={onEdit}
          aria-label="Edit"
          title="Edit"
          className="rounded-md p-1.5 text-ink-secondary transition hover:bg-app-panel hover:text-brand"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          aria-label="Hapus"
          title="Hapus"
          className="rounded-md p-1.5 text-ink-secondary transition hover:bg-danger-bg hover:text-danger"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </button>
      )}
    </div>
  )
}
