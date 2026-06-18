import type { ButtonHTMLAttributes } from 'react'
import { Icon } from './icon'

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text'

/** Material-3 button. Renders an optional leading icon; `full` stretches to 100% width. */
export function Button({
  variant = 'filled',
  icon,
  full,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  icon?: string
  full?: boolean
}) {
  return (
    <button
      type="button"
      className={`md-button md-button--${variant}${full ? ' md-button--full' : ''}${className ? ' ' + className : ''}`}
      {...rest}
    >
      {icon ? <Icon name={icon} /> : null}
      {children}
    </button>
  )
}

/** Material-3 icon-only button (40×40 touch target). */
export function IconButton({
  icon,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: string }) {
  return (
    <button type="button" className={`md-icon-button${className ? ' ' + className : ''}`} {...rest}>
      <Icon name={icon} />
    </button>
  )
}
