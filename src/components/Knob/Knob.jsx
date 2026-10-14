import React, { useEffect, useRef, useState } from 'react'

import { clamp, formatValue, fromNormal, toNormal } from '../../core/scale.js'

// Кноб (Knob Full из кита, 70 × 81). Контролируемый: значение приходит
// в value, изменения уходят через handleChange(property, value).
//
// Управление:
//   тянуть вверх / вниз — больше / меньше, весь ход ≈ 200 px,
//   с Shift — точнее (×0.25);
//   двойной клик — значение по умолчанию;
//   колесо мыши и стрелки — мелкий шаг (1%), с Shift — крупный (10%);
//   Home / End — минимум / максимум.

const DRAG_RANGE = 200
const FINE = 0.25
const STEP = 0.01
const BIG_STEP = 0.1
const LABEL_HOLD_MS = 900

// Геометрия снята из макета (экспорт SVG узлов Knob Full 72:4801/72:4802).
// Координаты SVG — как в экспорте: рисунок выходит за коробку 70 × 66
// на ширину обводки, поэтому SVG сдвинут на OFFSET
const VIEW_W = 73
const VIEW_H = 72
const OFFSET_X = -1.3
const OFFSET_Y = -1.52
// Дуга: радиус 35, 270°, разрыв 90° внизу
const CX = 36.3043
const CY = 43.32
const R = 35
const STROKE = 2.60869
const START = -135
const SWEEP = 270
// Диск чуть ниже центра дуги (как в макете) и вращается вокруг своего центра
const DISK_CY = CY + 0.7
const DISK_R = 25
const HOLE_R = 4.69
const HOLE_Y = DISK_CY - 16.71
// Поинтер в положении «вверх»; тёмная обводка отделяет его от дуги
const POINTER =
  'M44.39 1.522V6.893L43.727 7.346L37.182 11.822L36.36 12.384L35.516 11.856' +
  'L28.365 7.379L27.651 6.933V1.522Z'
const POINTER_STROKE = 3.04348

// Точка на окружности: угол от вершины по часовой стрелке
function point(angle, r = R) {
  const rad = ((angle - 90) * Math.PI) / 180
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)]
}

function arc(from, to) {
  if (to - from < 0.01) return ''
  const [x1, y1] = point(from)
  const [x2, y2] = point(to)
  const large = to - from > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`
}

let maskId = 0

export default function Knob({
  name,
  property,
  value,
  min,
  max,
  defaultValue = min,
  scale = 'linear',
  unit,
  handleChange
}) {
  const range = { min, max, scale }
  const normal = toNormal(value, range)
  const angle = START + SWEEP * normal

  const [showValue, setShowValue] = useState(false)
  const drag = useRef(null)
  const hideTimer = useRef(null)
  const mask = useRef(`knob-hole-${maskId++}`)

  useEffect(() => () => clearTimeout(hideTimer.current), [])

  // Подпись временно показывает значение с единицами
  function flashValue() {
    setShowValue(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      if (!drag.current) setShowValue(false)
    }, LABEL_HOLD_MS)
  }

  function setNormal(next) {
    const n = clamp(next)
    handleChange(property, fromNormal(n, range))
    flashValue()
    return n
  }

  function handlePointerDown(event) {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.focus()
    // Нормализованное значение копится в ref, а не пересчитывается
    // из value: так дробные значения не теряются при медленном движении
    drag.current = { y: event.clientY, normal }
    setShowValue(true)
  }

  function handlePointerMove(event) {
    if (!drag.current) return
    const dy = drag.current.y - event.clientY
    if (dy === 0) return

    const k = event.shiftKey ? FINE : 1
    drag.current.y = event.clientY
    drag.current.normal = setNormal(drag.current.normal + (dy / DRAG_RANGE) * k)
  }

  function handlePointerUp(event) {
    if (!drag.current) return
    drag.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    flashValue()
  }

  function handleDoubleClick() {
    handleChange(property, defaultValue)
    flashValue()
  }

  function handleWheel(event) {
    event.preventDefault()
    const step = event.shiftKey ? BIG_STEP : STEP
    setNormal(normal + (event.deltaY < 0 ? step : -step))
  }

  function handleKeyDown(event) {
    const step = event.shiftKey ? BIG_STEP : STEP
    const keys = {
      ArrowUp: normal + step,
      ArrowRight: normal + step,
      ArrowDown: normal - step,
      ArrowLeft: normal - step,
      PageUp: normal + BIG_STEP,
      PageDown: normal - BIG_STEP,
      Home: 0,
      End: 1
    }
    if (!(event.key in keys)) return
    event.preventDefault()
    setNormal(keys[event.key])
  }

  // Колесо: React вешает wheel как passive, поэтому preventDefault
  // работает только через собственный обработчик
  const body = useRef(null)
  const wheel = useRef(handleWheel)
  wheel.current = handleWheel
  useEffect(() => {
    const element = body.current
    const listener = (event) => wheel.current(event)
    element.addEventListener('wheel', listener, { passive: false })
    return () => element.removeEventListener('wheel', listener)
  }, [])

  const label = unit ? formatValue(value, { unit }) : String(value)

  return (
    <div className="Knob">
      <div
        ref={body}
        className="Knob-body"
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
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
      >
        <svg
          width={VIEW_W}
          height={VIEW_H}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          style={{ marginLeft: OFFSET_X, marginTop: OFFSET_Y }}
          aria-hidden="true"
        >
          <defs>
            <mask id={mask.current}>
              <rect width={VIEW_W} height={VIEW_H} fill="white" />
              <circle cx={CX} cy={HOLE_Y} r={HOLE_R} fill="black" />
            </mask>
          </defs>

          <path
            className="Knob-track"
            strokeWidth={STROKE}
            d={arc(START, START + SWEEP)}
          />
          <path
            className="Knob-fill"
            strokeWidth={STROKE}
            d={arc(START, angle)}
          />

          {/* Диск и поинтер поворачиваются на один угол */}
          <g transform={`rotate(${angle} ${CX} ${DISK_CY})`}>
            <circle
              className="Knob-disk"
              cx={CX}
              cy={DISK_CY}
              r={DISK_R}
              mask={`url(#${mask.current})`}
            />
          </g>
          <path
            className="Knob-pointer"
            d={POINTER}
            strokeWidth={POINTER_STROKE}
            transform={`rotate(${angle} ${CX} ${CY})`}
          />
        </svg>
      </div>

      <span className="Knob-label text-label">{showValue ? label : name}</span>
    </div>
  )
}
