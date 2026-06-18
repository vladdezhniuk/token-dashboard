import type { CSSProperties } from 'react'
import { Toaster as SonnerToaster } from 'sonner'

// Map Sonner's surface variables onto our Material-3 tokens (which already flip for
// dark mode), so toasts follow the design system.
const m3Theme = {
  '--normal-bg': 'var(--color-surface-container-highest)',
  '--normal-text': 'var(--color-on-surface)',
  '--normal-border': 'var(--color-outline-variant)',
  '--success-bg': 'var(--color-success-container)',
  '--success-text': 'var(--color-on-success-container)',
  '--success-border': 'var(--color-success-container)',
  '--error-bg': 'var(--color-error-container)',
  '--error-text': 'var(--color-on-error-container)',
  '--error-border': 'var(--color-error-container)',
} as CSSProperties

/** App-wide toast outlet (Sonner). Mount once; raise toasts with the `toast` helper. */
export function Toaster() {
  return <SonnerToaster position="bottom-center" theme="system" richColors closeButton style={m3Theme} />
}
