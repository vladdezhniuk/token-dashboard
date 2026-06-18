import type { ReactNode } from 'react'

/** Stacked label + value pair. Class overrides let callers re-use it for any type scale. */
export function Stat({
  label,
  children,
  labelClassName = 'text-label-medium text-on-surface-variant',
  valueClassName = 'text-headline-small',
}: {
  label: ReactNode
  children: ReactNode
  labelClassName?: string
  valueClassName?: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={labelClassName}>{label}</span>
      <span className={valueClassName}>{children}</span>
    </div>
  )
}
