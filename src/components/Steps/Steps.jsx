import React from 'react'

import useKeyboardFocus from '../hooks/useKeyboardFocus.js'

// Выбор одного варианта из нескольких (Steps Full из кита).
// Активный вариант белый, остальные приглушены. Контролируемый:
// value + handleChange(property, value).
//
// orientation:
//   vertical   — столбик (Interval, Wave, Time L/R), 70 × 65;
//   horizontal — строка в плашке (Ping-Pong yes / no), 156 × 25.
// options — значения, labels — подписи к ним (по умолчанию String(value)).
// Клавиатура: стрелки выбирают соседний вариант.

export default function Steps({
  name,
  property,
  value,
  options,
  labels = {},
  orientation = 'vertical',
  handleChange,
  className = ''
}) {
  const { keyboard, focusHandlers } = useKeyboardFocus()
  const index = options.indexOf(value)

  function select(option) {
    if (option !== value) handleChange(property, option)
  }

  function handleKeyDown(event) {
    const forward = ['ArrowDown', 'ArrowRight'].includes(event.key)
    const back = ['ArrowUp', 'ArrowLeft'].includes(event.key)
    if (!forward && !back) return

    event.preventDefault()
    const next = Math.min(
      options.length - 1,
      Math.max(0, index + (forward ? 1 : -1))
    )
    select(options[next])
  }

  const classes = ['Steps', `Steps-${orientation}`, className]
  if (keyboard) classes.push('is-keyboard')

  return (
    <div className={classes.join(' ')}>
      <div
        className="Steps-options"
        role="radiogroup"
        aria-label={name}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        {...focusHandlers}
      >
        {options.map((option) => {
          const active = option === value
          return (
            <div
              key={String(option)}
              className={active ? 'Steps-option is-active' : 'Steps-option'}
              role="radio"
              aria-checked={active}
              onClick={() => select(option)}
            >
              <span className="text-small">
                {labels[option] ?? String(option)}
              </span>
            </div>
          )
        })}
      </div>

      {name && <span className="Steps-label text-label">{name}</span>}
    </div>
  )
}
