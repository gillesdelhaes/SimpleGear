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

const SIZES: Record<ModalSize, string> = {
  sm: 'max-w-[480px]',
  md: 'max-w-[600px]',
  lg: 'max-w-[800px]',
  xl: 'max-w-[1000px]',
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
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`bg-white rounded-2xl shadow-xl w-full ${SIZES[size]} max-h-[90vh] flex flex-col`}>
        <div className="flex items-start justify-between px-6 py-4 border-b border-neutral-100">
          <div>
            <h2 className="text-base font-bold text-neutral-900 tracking-tight">{title}</h2>
            {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg p-1.5 transition-colors"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1 scrollbar-thin">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-neutral-100 flex justify-end gap-2">{footer}</div>
        )}
      </div>
    </div>
  )
}
