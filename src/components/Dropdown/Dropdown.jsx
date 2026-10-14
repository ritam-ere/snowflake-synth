import React, { useEffect, useRef, useState } from 'react'

import useKeyboardFocus from '../hooks/useKeyboardFocus.js'

// Выпадающий список (Instrument dropdown из кита, 156 × 25).
// Контролируемый: value + handleChange(property, value).
//
// options — значения, labels — подписи к ним.
// status — состояние загрузки выбранного варианта:
//   ready   — шеврон;
//   loading — бегущие точки вместо шеврона (сэмплы ещё грузятся);
//   error   — восклицательный знак и подсказка.
//
// Мышь: клик открывает список, клик по варианту выбирает, клик мимо закрывает.
// Клавиатура: Enter / Space / ↓ открывают, ↑ ↓ — по вариантам,
// Enter выбирает, Escape закрывает.

export default function Dropdown({
  name,
  property,
  value,
  options,
  labels = {},
  status = 'ready',
  handleChange
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(() => options.indexOf(value))
  const { keyboard, focusHandlers } = useKeyboardFocus()
  const root = useRef(null)
  const button = useRef(null)

  const label = (option) => labels[option] ?? String(option)

  // Клик мимо закрывает список
  useEffect(() => {
    if (!open) return
    function handleOutside(event) {
      if (!root.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handleOutside)
    return () => document.removeEventListener('pointerdown', handleOutside)
  }, [open])

  function openList() {
    setActive(Math.max(0, options.indexOf(value)))
    setOpen(true)
  }

  function select(option) {
    setOpen(false)
    button.current.focus({ focusVisible: false })
    if (option !== value) handleChange(property, option)
  }

  function handleKeyDown(event) {
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault()
        openList()
      }
      return
    }

    if (event.key === 'Escape' || event.key === 'Tab') {
      setOpen(false)
      return
    }

    const moves = { ArrowDown: 1, ArrowUp: -1 }
    if (event.key in moves) {
      event.preventDefault()
      setActive((i) =>
        Math.min(options.length - 1, Math.max(0, i + moves[event.key]))
      )
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      select(options[active])
    }
  }

  const classes = ['Dropdown']
  if (open) classes.push('is-open')
  if (keyboard) classes.push('is-keyboard')

  return (
    <div className={classes.join(' ')} ref={root}>
      <button
        ref={button}
        type="button"
        className="Dropdown-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={name}
        aria-busy={status === 'loading'}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
        {...focusHandlers}
      >
        <span className="Dropdown-value text-small">{label(value)}</span>
        <span className={`Dropdown-status is-${status}`} aria-hidden="true">
          {status === 'loading' && (
            <>
              <i />
              <i />
              <i />
            </>
          )}
          {status === 'error' && '!'}
          {status === 'ready' && (
            <svg width="6" height="3" viewBox="0 0 6 3">
              <path d="M0.5 0.5L3 2.5L5.5 0.5" />
            </svg>
          )}
        </span>
      </button>

      {open && (
        <ul className="Dropdown-list" role="listbox" aria-label={name}>
          {options.map((option, i) => {
            const selected = option === value
            const classes = ['Dropdown-option', 'text-small']
            if (selected) classes.push('is-selected')
            if (i === active) classes.push('is-active')
            return (
              <li
                key={String(option)}
                className={classes.join(' ')}
                role="option"
                aria-selected={selected}
                onPointerEnter={() => setActive(i)}
                onClick={() => select(option)}
              >
                {label(option)}
              </li>
            )
          })}
        </ul>
      )}

      {name && (
        <span className="Dropdown-label text-label">
          {status === 'error' ? 'Not loaded' : name}
        </span>
      )}
    </div>
  )
}
