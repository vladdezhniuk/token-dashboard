import { useCallback, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { Icon } from './icon'
import { ToastContext, type ToastKind } from './toast-context'

interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

let nextId = 0

/** Renders queued snackbars and provides the {@link useToast} `show` API to children. */
export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, kind, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="md-snackbar-wrap">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`md-snackbar${t.kind !== 'info' ? ' md-snackbar--' + t.kind : ''}`}
          >
            <Icon name={t.kind === 'success' ? 'check_circle' : t.kind === 'error' ? 'error' : 'info'} />
            <span className="text-body-medium">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
