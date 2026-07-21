import Modal from './Modal'
import Button from './Button'
import { useT } from '@/lib/i18n'

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
  title,
  message,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
}: Props) {
  const { t } = useT()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title ?? t('Hapus data')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('Batal')}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? t('Menghapus…') : confirmLabel ?? t('Hapus')}
          </Button>
        </>
      }
    >
      <p className="text-[13px] leading-relaxed text-ink-secondary">{message}</p>
    </Modal>
  )
}
