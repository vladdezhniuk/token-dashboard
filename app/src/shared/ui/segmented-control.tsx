import type { ReactNode } from 'react'

interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
}

/** Compact single-select toggle group (Material-3 segmented buttons). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-full border border-outline-variant">
      {options.map((opt) => {
        const active = opt.value === value
        const tone = active
          ? 'bg-secondary-container text-on-secondary-container'
          : 'text-on-surface-variant'
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`h-8 px-4 rounded-full text-label-large cursor-pointer transition-colors ${tone}`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
