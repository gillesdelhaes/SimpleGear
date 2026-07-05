interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  danger = true,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <>
      <div className="scrim open" style={{ zIndex: 20 }} onClick={onCancel} />
      <div
        className="modal open"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        style={{ width: 'min(440px, 94vw)', zIndex: 21, textAlign: 'center' }}
      >
        <div
          className="mx-auto mb-4 flex items-center justify-center"
          style={{ width: 46, height: 46, borderRadius: 15, background: 'var(--warn-bg)', color: 'var(--warn-ink)' }}
        >
          <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h2 style={{ marginBottom: 8 }}>{title}</h2>
        <p className="sub" style={{ marginBottom: 22 }}>{message}</p>
        <div className="flex gap-2 justify-center">
          <button onClick={onCancel} className="btn ghost">Cancel</button>
          <button onClick={onConfirm} className={`btn${danger ? ' ghost danger' : ''}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  )
}
