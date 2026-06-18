import type { ReactNode } from 'react'
import { Icon } from './icon'

/**
 * Card title row: primary-coloured icon + heading. Pass `action` to render a
 * trailing control (e.g. a refresh button), which switches to a space-between row.
 */
export function CardHeader({
  icon,
  title,
  action,
}: {
  icon: string
  title: ReactNode
  action?: ReactNode
}) {
  // NOTE: keep each Tailwind utility inside a complete static string. A generated
  // utility placed directly before `${...}` (e.g. `gap-2.5${cond}`) is not extracted
  // by Tailwind's scanner and the rule is never emitted.
  const head = (
    <div className={action ? 'flex items-center gap-2.5' : 'flex items-center gap-2.5 mb-4'}>
      <Icon name={icon} className="text-primary" />
      <h2 className="text-title-large m-0">{title}</h2>
    </div>
  )

  if (!action) return head

  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      {head}
      {action}
    </div>
  )
}
