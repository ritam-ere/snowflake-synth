import React from 'react'

import { linkPath } from './linkPath.js'

// Слой поверх экрана, на котором рисуется связь, пока её тянут.
// Не перехватывает указатель: под ним работают подсветка и drop
export default function LinkLayer({ drag }) {
  if (!drag) return null

  return (
    <svg className={`LinkLayer LinkLayer-${drag.voice}`} aria-hidden="true">
      <path className="LinkLayer-curve" d={linkPath(drag.from, drag.to)} />
      <circle className="LinkLayer-end" cx={drag.to.x} cy={drag.to.y} r="5" />
    </svg>
  )
}
