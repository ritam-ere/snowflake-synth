import React from 'react'

import { motif } from '../../core/motifs.js'
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
// Вырезы — мотивы эффектов по таблице раздела 9 (core/motifs.js),
// каждый обрезан по своей области зоны.
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

// Координаты клина → SVG: хребет справа, вершина внизу
const WEDGE_SPACE = `translate(${WIDTH} ${L}) scale(-1 -1)`

function Shape({ item }) {
  const color = item.paper ? 'white' : 'black'
  if (item.shape === 'circle') {
    return <circle cx={item.cx} cy={item.cy} r={item.r} fill={color} />
  }
  const open = !item.d.endsWith('Z')
  return (
    <path
      d={item.d}
      fill={open ? 'none' : color}
      stroke={item.stroke ? color : 'none'}
      strokeWidth={item.stroke}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  )
}

// Вырез одной ноды: мотив эффекта, обрезанный по своей области
function Cut({ cut, clipId }) {
  const points = cut.region.polygon.map(([x, y]) => `${x},${y}`).join(' ')
  return (
    <>
      <clipPath id={clipId}>
        <polygon points={points} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        {motif(cut).map((item, i) => (
          <Shape key={i} item={item} />
        ))}
      </g>
    </>
  )
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
          <g transform={WEDGE_SPACE}>
            {cuts.map((cut) => (
              <Cut
                key={cut.nodeId}
                cut={cut}
                clipId={`${mask.current}-${cut.nodeId}`}
              />
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
