import Modal from './Modal'
import Button from './Button'

interface Props {
  open: boolean
  title?: string
  message: string
  confirmLabel?: string
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmDialog({
  open,
  title = 'Hapus data',
  message,
  confirmLabel = 'Hapus',
  busy,
  onConfirm,
  onClose,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Menghapus…' : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[13px] leading-relaxed text-ink-secondary">{message}</p>
    </Modal>
  )
}
