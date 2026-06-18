import type { InputHTMLAttributes } from 'react'

/** Material-3 outlined text field with an optional label and help/error text. */
export function TextField({
  label,
  error,
  help,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: boolean
  help?: string
}) {
  return (
    <label className={`md-field${error ? ' md-field--error' : ''}${className ? ' ' + className : ''}`}>
      {label ? <span className="md-field__label text-body-medium">{label}</span> : null}
      <input {...rest} />
      <span className="md-field__help text-label-medium">{help ?? ''}</span>
    </label>
  )
}
