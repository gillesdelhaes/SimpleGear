import { useEffect } from 'react'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  size?: ModalSize
  children: React.ReactNode
  footer?: React.ReactNode
}

const SIZES: Record<ModalSize, number> = {
  sm: 480,
  md: 600,
  lg: 800,
  xl: 1000,
}

export default function Modal({ open, onClose, title, subtitle, size = 'md', children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div className="scrim open" onClick={onClose} />
      <div
        className="modal open"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ width: `min(${SIZES[size]}px, 94vw)`, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="sub" style={{ marginBottom: 0 }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} className="so-close" aria-label="Close">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 scrollbar-thin pt-3">{children}</div>
        {footer && <div className="modal-actions">{footer}</div>}
      </div>
    </>
  )
}
