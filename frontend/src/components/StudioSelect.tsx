import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import './StudioSelect.css'

export type StudioSelectOption<Value extends string> = {
  value: Value
  label: string
  icon?: ReactNode
  description?: string
}

type StudioSelectProps<Value extends string> = {
  label: string
  value: Value
  options: readonly StudioSelectOption<Value>[]
  onChange: (value: Value) => void
  disabled?: boolean
  placeholder?: string
  icon?: ReactNode
}

/** Shared content-sized selector. Keep its arrow and interaction styling here. */
export default function StudioSelect<Value extends string>({
  label, value, options, onChange, disabled = false, placeholder = '—', icon,
}: StudioSelectProps<Value>) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const initialFocus = useRef<'selected' | 'first' | 'last'>('selected')
  const [open, setOpen] = useState(false)
  const expanded = open && !disabled && options.length > 0
  const selected = options.find(option => option.value === value)
  const triggerIcon = selected?.icon ?? icon
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === value))
  const optionCount = options.length

  useEffect(() => {
    if (!expanded) return
    const buttons = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')
    const index = initialFocus.current === 'first' ? 0 : initialFocus.current === 'last' ? optionCount - 1 : selectedIndex
    buttons?.[index]?.focus()

    const dismiss = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [expanded, selectedIndex, optionCount])

  function closeAndFocus() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  function handleOptionKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeAndFocus()
      return
    }
    const last = options.length - 1
    const next = event.key === 'ArrowDown' ? (index + 1) % options.length
      : event.key === 'ArrowUp' ? (index + last) % options.length
      : event.key === 'Home' ? 0 : event.key === 'End' ? last : null
    if (next !== null) {
      event.preventDefault()
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')[next]?.focus()
    }
  }

  return (
    <div className="studio-select" ref={rootRef} onBlur={event => {
      // Safari may report no destination before an option's click fires.
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false)
    }}>
      <button
        type="button" ref={triggerRef}
        className={`studio-select-trigger ${expanded ? 'is-open' : ''}`}
        disabled={disabled || !options.length}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-haspopup="listbox" aria-expanded={expanded} aria-controls={`${id}-menu`}
        onClick={() => { initialFocus.current = 'selected'; setOpen(current => !current) }}
        onKeyDown={event => {
          if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault()
            initialFocus.current = event.key === 'Home' ? 'first' : event.key === 'End' ? 'last' : 'selected'
            setOpen(true)
          } else if (event.key === 'Escape') closeAndFocus()
        }}
      >
        {triggerIcon && <span className="studio-select-icon" aria-hidden="true">{triggerIcon}</span>}
        <span className="studio-select-content">
          <small id={`${id}-label`}>{label}</small>
          <bdi id={`${id}-value`} dir="auto">{selected?.label ?? placeholder}</bdi>
        </span>
        <svg className="studio-select-chevron" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
          <path d="M2.05 3.55h7.9c.57 0 .88.67.5 1.11L6.5 9.12a.65.65 0 0 1-1 0L1.55 4.66c-.38-.44-.07-1.11.5-1.11Z" fill="currentColor" />
        </svg>
      </button>
      <div id={`${id}-menu`} className="studio-select-menu" ref={menuRef} role="listbox" aria-labelledby={`${id}-label`} hidden={!expanded}>
        {options.map((option, index) => (
          <button
            key={option.value} type="button" role="option" tabIndex={-1}
            aria-selected={option.value === value}
            className={`studio-select-option ${option.value === value ? 'is-selected' : ''}`}
            onClick={() => { onChange(option.value); closeAndFocus() }}
            onKeyDown={event => handleOptionKey(event, index)}
          >
            <span className="studio-select-option-main">
              {option.icon && <span className="studio-select-icon" aria-hidden="true">{option.icon}</span>}
              <bdi dir="auto">{option.label}</bdi>
            </span>
            {option.description && <small dir="auto">{option.description}</small>}
          </button>
        ))}
      </div>
    </div>
  )
}
