import { createContext, useCallback, useContext, useState } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  toasts: Toast[]
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

const COLORS: Record<ToastType, string> = {
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, showToast }}>
      {children}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-[460px] max-w-[90vw] pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-white border border-neutral-200 rounded-xl shadow-lg flex items-center gap-3 px-4 py-3 pointer-events-auto animate-fade-up"
            style={{ borderLeft: `3px solid ${COLORS[t.type]}` }}
          >
            <span className="text-sm font-bold" style={{ color: COLORS[t.type] }}>
              {ICONS[t.type]}
            </span>
            <span className="text-sm text-neutral-700 flex-1">{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-neutral-400 hover:text-neutral-600 text-xs"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx.showToast
}
