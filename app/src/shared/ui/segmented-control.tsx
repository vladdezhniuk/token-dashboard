import type { ReactNode } from 'react'

interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
}

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
    <div className="inline-flex items-center gap-1">
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
            className={`relative overflow-hidden h-9 px-4 rounded-full text-label-large cursor-pointer select-none transition-colors after:absolute after:inset-0 after:bg-current after:opacity-0 after:transition-opacity hover:after:opacity-[0.08] active:after:opacity-[0.12] ${tone}`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
