import { createContext, useContext } from 'react'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastApi {
  show: (message: string, kind?: ToastKind) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

/** Access the toast API. Must be called within a `<ToastProvider>`. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}
