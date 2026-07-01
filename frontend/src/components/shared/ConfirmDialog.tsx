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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-[440px] p-7 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-50 flex items-center justify-center">
          <svg width="24" height="24" fill="none" stroke="#F59E0B" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-neutral-900 mb-2">{title}</h3>
        <p className="text-sm text-neutral-500 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-lg border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${danger ? 'bg-red-500 hover:bg-red-600' : 'gradient-bg hover:opacity-90'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
