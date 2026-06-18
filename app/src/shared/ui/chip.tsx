import type { ReactNode } from 'react'
import { Icon } from './icon'

/** Material-3 assist chip with an optional leading icon. */
export function Chip({ icon, children }: { icon?: string; children: ReactNode }) {
  return (
    <span className="md-chip">
      {icon ? <Icon name={icon} /> : null}
      {children}
    </span>
  )
}
