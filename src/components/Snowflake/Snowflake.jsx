import React from 'react'

import { L, WIDTH, snowflakePattern } from '../../core/snowflake.js'

// Сложенный клин снежинки в панели (задача 6.1). Геометрия и узор —
// чистые функции из core/snowflake.js; здесь только рисование.
// Вырезы пока простые заглушки (круг, выемка, полукруг), размер — по Mix;
// мотивы каждого эффекта по таблице раздела 9 — задача 6.2.
//
// Координаты клина: x — от хребта влево, y — от вершины вверх.
// В SVG вершина внизу, хребет справа, как в макете.

const TAN15 = Math.tan(Math.PI / 12)
const COS30 = Math.cos(Math.PI / 6)
const SIN30 = 0.5

const toSvg = (x, y) => [WIDTH - x, L - y]

// Клин со скруглённым кончиком
const WEDGE = (() => {
  const [ax, ay] = toSvg(0, 0)
  const tip = 10
  const [lx, ly] = toSvg(tip * SIN30, tip * COS30)
  return `M 0 0 H ${WIDTH} V ${ay - tip} Q ${ax} ${ay} ${lx} ${ly} Z`
})()

// Линия сгиба по биссектрисе клина
const CREASE = (() => {
  const [x0, y0] = toSvg(0, 14)
  const [x1, y1] = toSvg(L * TAN15, L)
  return `M ${x0} ${y0} L ${x1} ${y1}`
})()

function Cut({ cut }) {
  const amount = 0.35 + 0.65 * cut.settings.mix
  const { slot } = cut

  if (cut.zone === 'center') {
    const [cx, cy] = toSvg(slot.x, slot.y)
    return <circle cx={cx} cy={cy} r={slot.radius * amount} />
  }

  if (cut.zone === 'edge') {
    const [x0] = toSvg(slot.to, L)
    const width = slot.to - slot.from
    const depth = slot.depth * amount
    return (
      <rect x={x0 + 3} y={-12} width={width - 6} height={12 + depth} rx="6" />
    )
  }

  // folds: полукруглая выемка на левом сгибе
  const middle = (slot.from + slot.to) / 2
  const [cx, cy] = toSvg(middle * SIN30, middle * COS30)
  return <circle cx={cx} cy={cy} r={slot.depth * amount} />
}

let maskCounter = 0

export default function Snowflake({ state }) {
  const cuts = snowflakePattern(state)
  const mask = React.useRef(`snowflake-cuts-${maskCounter++}`)

  return (
    <svg
      className="Snowflake"
      width={WIDTH}
      height={L}
      viewBox={`0 0 ${WIDTH} ${L}`}
      role="img"
      aria-label={`Snowflake wedge, ${cuts.length} cuts`}
    >
      <defs>
        <mask id={mask.current}>
          <path d={WEDGE} fill="white" />
          <g fill="black">
            {cuts.map((cut) => (
              <Cut key={cut.nodeId} cut={cut} />
            ))}
          </g>
        </mask>
      </defs>

      <path
        className="Snowflake-paper"
        d={WEDGE}
        mask={`url(#${mask.current})`}
      />
      <path className="Snowflake-crease" d={CREASE} />
    </svg>
  )
}
