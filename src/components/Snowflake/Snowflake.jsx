import React from 'react'

import {
  ANGLE,
  COS,
  L,
  SIN,
  WIDTH,
  snowflakePattern
} from '../../core/snowflake.js'

// Сложенный клин снежинки в панели (задача 6.1), форма — из макета. Геометрия и узор —
// чистые функции из core/snowflake.js; здесь только рисование.
// Вырезы пока простые заглушки (круг, выемка, полукруг), размер — по Mix;
// мотивы каждого эффекта по таблице раздела 9 — задача 6.2.
//
// Координаты клина: x — от хребта влево, y — от вершины вверх.
// В SVG вершина внизу, хребет справа, как в макете.

const TAN_HALF = Math.tan(ANGLE / 2)

const toSvg = (x, y) => [WIDTH - x, L - y]

// Клин со слегка скруглёнными углами: кончик (вершина) и два угла края.
// Скругление — квадратичной кривой через угол
const ROUND_TIP = 10
const ROUND_CORNER = 6

const WEDGE = (() => {
  // углы клина в SVG: левый верхний, правый верхний, кончик внизу справа
  const [lx, ly] = [0, 0]
  const [rx, ry] = [WIDTH, 0]
  const [tx, ty] = toSvg(0, 0)
  // единичный вектор вдоль гипотенузы (от левого верхнего к кончику)
  const ux = SIN
  const uy = COS
  const c = ROUND_CORNER
  const t = ROUND_TIP
  return [
    `M ${lx + c} ${ly}`,
    `H ${rx - c}`,
    `Q ${rx} ${ry} ${rx} ${ry + c}`,
    `V ${ty - t}`,
    `Q ${tx} ${ty} ${tx - t * ux} ${ty - t * uy}`,
    `L ${lx + c * ux} ${ly + c * uy}`,
    `Q ${lx} ${ly} ${lx + c} ${ly}`,
    'Z'
  ].join(' ')
})()

// Линия сгиба по биссектрисе клина
const CREASE = (() => {
  const [x0, y0] = toSvg(0, 14)
  const [x1, y1] = toSvg(L * TAN_HALF, L)
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
  const [cx, cy] = toSvg(middle * SIN, middle * COS)
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
