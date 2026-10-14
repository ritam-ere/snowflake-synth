import React, { useEffect, useRef, useState } from 'react'

import { clamp, formatValue, fromNormal, toNormal } from '../../core/scale.js'
import useKeyboardFocus from '../hooks/useKeyboardFocus.js'
import {
  BRICK_H,
  BRICK_W,
  STRIP_H,
  STRIP_W,
  bricks,
  wavePath
} from './stripMath.js'

// Полоска с бегунком-треугольником сверху (раздел 10 ТЗ), 156 × 25.
// Контролируемая: value + handleChange(property, value).
//
// variant:
//   wave     — Rate у Vibrato: бегущая волна, чем выше значение, тем гуще;
//   bricks   — Oct у Phaser: кирпичики расходятся от средней линии;
//   gradient — Tone у Distortion: градиент от бледного к яркому;
//   volume   — громкость голоса: градиент в цвете голоса.
//
// Управление: зажать и вести влево-вправо, клик переносит бегунок;
// двойной клик — значение по умолчанию; стрелки — шаг 1% (Shift — 10%).

const STEP = 0.01
const BIG_STEP = 0.1
const LABEL_HOLD_MS = 900
// Скорость бега волны: оборотов в секунду на 1 Гц
const WAVE_SPEED = 0.25

// Поинтер как у кноба: остриё вниз, тёмная обводка цвета карточки
const POINTER =
  'M8.37 -6V-0.63L7.707 -0.177L1.162 4.299L0.34 4.861L-0.504 4.333' +
  'L-7.655 -0.144L-8.369 -0.59V-6Z'
const POINTER_STROKE = 3.04348
const LINE_W = 3

// Бегущая волна: путь обновляется в requestAnimationFrame напрямую,
// без перерисовки React на каждом кадре
function Wave({ normal, anchor, rate }) {
  const path = useRef(null)
  const state = useRef({ phase: 0, normal, anchor, rate })
  state.current.normal = normal
  state.current.anchor = anchor
  state.current.rate = rate

  useEffect(() => {
    let frame
    let last = performance.now()

    function tick(now) {
      const s = state.current
      s.phase = (s.phase + ((now - last) / 1000) * s.rate * WAVE_SPEED) % 1
      last = now
      path.current?.setAttribute('d', wavePath(s.normal, s.phase, s.anchor))
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <path
      ref={path}
      className="Strip-waveLine"
      d={wavePath(normal, state.current.phase, anchor)}
    />
  )
}

function Bricks({ normal }) {
  return bricks(normal).map((brick, i) => (
    <rect
      key={i}
      className="Strip-brick"
      x={brick.x}
      y={brick.y}
      width={BRICK_W}
      height={BRICK_H}
    />
  ))
}

export default function Strip({
  name,
  property,
  value,
  min,
  max,
  defaultValue = min,
  scale = 'linear',
  unit,
  variant = 'gradient',
  handleChange
}) {
  const range = { min, max, scale }
  const normal = toNormal(value, range)
  const x = normal * STRIP_W

  const [showValue, setShowValue] = useState(false)
  const { keyboard, focusHandlers } = useKeyboardFocus()
  const dragging = useRef(false)
  const hideTimer = useRef(null)

  useEffect(() => () => clearTimeout(hideTimer.current), [])

  function flashValue() {
    setShowValue(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      if (!dragging.current) setShowValue(false)
    }, LABEL_HOLD_MS)
  }

  function setNormal(next) {
    handleChange(property, fromNormal(clamp(next), range))
    flashValue()
  }

  function normalAt(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    return (event.clientX - rect.left) / rect.width
  }

  function handlePointerDown(event) {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.focus({ focusVisible: false })
    focusHandlers.onPointerDown()
    dragging.current = true
    setNormal(normalAt(event))
  }

  function handlePointerMove(event) {
    if (dragging.current) setNormal(normalAt(event))
  }

  function handlePointerUp(event) {
    if (!dragging.current) return
    dragging.current = false
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    flashValue()
  }

  function handleKeyDown(event) {
    const step = event.shiftKey ? BIG_STEP : STEP
    const keys = {
      ArrowRight: normal + step,
      ArrowUp: normal + step,
      ArrowLeft: normal - step,
      ArrowDown: normal - step,
      PageUp: normal + BIG_STEP,
      PageDown: normal - BIG_STEP,
      Home: 0,
      End: 1
    }
    if (!(event.key in keys)) return
    event.preventDefault()
    setNormal(keys[event.key])
  }

  const label = unit ? formatValue(value, { unit }) : String(value)
  const classes = ['Strip', `Strip-${variant}`]
  if (keyboard) classes.push('is-keyboard')

  return (
    <div className={classes.join(' ')}>
      <div
        className="Strip-body"
        role="slider"
        tabIndex={0}
        aria-label={name}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={label}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={() => {
          handleChange(property, defaultValue)
          flashValue()
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={focusHandlers.onKeyUp}
        onBlur={focusHandlers.onBlur}
      >
        <svg
          width={STRIP_W}
          height={STRIP_H}
          viewBox={`0 0 ${STRIP_W} ${STRIP_H}`}
          aria-hidden="true"
        >
          <rect className="Strip-track" width={STRIP_W} height={STRIP_H} />

          {variant === 'wave' && (
            <Wave normal={normal} anchor={x} rate={value} />
          )}
          {variant === 'bricks' && <Bricks normal={normal} />}

          {/* Указатель: линия на всю высоту полоски цвета обводки бегунка,
              вместе с бегунком лежит поверх графики */}
          <rect
            className="Strip-line"
            x={x - LINE_W / 2}
            y={0}
            width={LINE_W}
            height={STRIP_H}
          />

          <path
            className="Strip-pointer"
            d={POINTER}
            strokeWidth={POINTER_STROKE}
            transform={`translate(${x} 0)`}
          />
        </svg>
      </div>

      <span className="Strip-label text-label">{showValue ? label : name}</span>
    </div>
  )
}
