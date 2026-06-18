import type { ReactNode } from 'react'

/** Material-3 surface container. `elevated` (default) adds a shadow; `outlined` a border. */
export function Card({
  children,
  variant = 'elevated',
  className,
}: {
  children: ReactNode
  variant?: 'elevated' | 'outlined' | 'filled'
  className?: string
}) {
  const modifier = variant === 'filled' ? '' : ` md-card--${variant}`
  return <section className={`md-card${modifier}${className ? ' ' + className : ''}`}>{children}</section>
}
