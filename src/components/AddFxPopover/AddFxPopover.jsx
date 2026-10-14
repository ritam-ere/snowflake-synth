import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { EFFECTS, EFFECT_TYPES } from '../../core/effects.js'
import Button from '../Button/Button.jsx'

// Поповер Add Effect (в макете его нет — предложение): выбор сразу
// нескольких эффектов. Порядок выбора — порядок, в котором ноды лягут
// по колонкам (номер справа). Выбрать можно не больше свободных мест
// до 12 нод.
//
// Рисуется в document.body (портал), чтобы его не обрезала прокрутка
// поля нод, и стоит под карточкой Add Effect (или сбоку, если внизу
// не хватает места).
//
// Мышь: клик по строке — выбрать / снять, Add — добавить, клик мимо —
// закрыть. Клавиатура: ↑ ↓ по строкам, Space — выбрать, Enter — добавить,
// Esc — закрыть.

const GAP = 8
const WIDTH = 220

export default function AddFxPopover({ anchor, room, handleAdd, handleClose }) {
  const [selected, setSelected] = useState([])
  const [active, setActive] = useState(0)
  const [position, setPosition] = useState(null)
  const root = useRef(null)
  const list = useRef(null)

  // Позиция от карточки: под ней, а если не влезает — над ней
  useLayoutEffect(() => {
    function place() {
      const card = anchor.getBoundingClientRect()
      const height = root.current.offsetHeight
      const below = card.bottom + GAP
      const maxTop = window.innerHeight - GAP - height

      // Под карточкой, если влезает; иначе — справа от неё
      if (below <= maxTop) {
        const left = Math.min(card.left, window.innerWidth - WIDTH - GAP)
        setPosition({ top: below, left })
      } else {
        const right = card.right + GAP
        const left =
          right + WIDTH <= window.innerWidth - GAP
            ? right
            : card.left - GAP - WIDTH
        setPosition({ top: Math.max(GAP, Math.min(card.top, maxTop)), left })
      }
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [anchor])

  // Фокус в список, когда поповер уже виден (скрытый элемент фокус не берёт)
  const placed = position !== null
  useEffect(() => {
    if (placed) list.current?.focus({ preventScroll: true })
  }, [placed])

  useEffect(() => {
    function handleOutside(event) {
      if (
        !root.current.contains(event.target) &&
        !anchor.contains(event.target)
      ) {
        handleClose()
      }
    }
    document.addEventListener('pointerdown', handleOutside)
    return () => document.removeEventListener('pointerdown', handleOutside)
  }, [])

  function toggle(type) {
    setSelected((prev) => {
      if (prev.includes(type)) return prev.filter((t) => t !== type)
      if (prev.length >= room) return prev
      return [...prev, type]
    })
  }

  function add() {
    if (selected.length > 0) handleAdd(selected)
  }

  function handleKeyDown(event) {
    const moves = { ArrowDown: 1, ArrowUp: -1 }
    if (event.key in moves) {
      event.preventDefault()
      setActive((i) =>
        Math.min(EFFECT_TYPES.length - 1, Math.max(0, i + moves[event.key]))
      )
    } else if (event.key === ' ') {
      event.preventDefault()
      toggle(EFFECT_TYPES[active])
    } else if (event.key === 'Enter') {
      event.preventDefault()
      add()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      handleClose()
    }
  }

  const full = selected.length >= room

  return createPortal(
    <div
      ref={root}
      className="AddFxPopover"
      role="dialog"
      aria-label="Add Effect"
      style={
        position
          ? { top: position.top, left: position.left, width: WIDTH }
          : { visibility: 'hidden', width: WIDTH }
      }
    >
      <div className="AddFxPopover-head">
        <span className="text-label">Add Effect</span>
        <span className="text-small AddFxPopover-room">
          {room - selected.length} left
        </span>
      </div>

      <ul
        ref={list}
        className="AddFxPopover-list"
        role="listbox"
        aria-multiselectable="true"
        aria-label="Effects"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {EFFECT_TYPES.map((type, i) => {
          const order = selected.indexOf(type)
          const isSelected = order !== -1
          const classes = ['AddFxPopover-option', 'text-small']
          if (isSelected) classes.push('is-selected')
          if (i === active) classes.push('is-active')
          if (!isSelected && full) classes.push('is-blocked')

          return (
            <li
              key={type}
              className={classes.join(' ')}
              role="option"
              aria-selected={isSelected}
              onPointerEnter={() => setActive(i)}
              onClick={() => toggle(type)}
            >
              <span>{EFFECTS[type].label}</span>
              {isSelected && (
                <span className="AddFxPopover-order">{order + 1}</span>
              )}
            </li>
          )
        })}
      </ul>

      <Button
        text={selected.length > 1 ? `Add ${selected.length}` : 'Add'}
        disabled={selected.length === 0}
        handleClick={add}
      />
    </div>,
    document.body
  )
}
