import React from 'react'

import LinkLines from './LinkLines.jsx'
import { linkPath } from './linkPath.js'

// Слой поверх поля нод (под плашками голосов) для связей:
//   drag  — связь, которую сейчас тянут (задача 4.3);
//   voice — открытый голос: линии ко всем его нодам (задача 4.4).
// Не перехватывает указатель
export default function LinkLayer({ drag, voice }) {
  const color = drag?.voice ?? voice
  if (!color) return null

  return (
    <svg className={`LinkLayer LinkLayer-${color}`} aria-hidden="true">
      {voice && !drag && <LinkLines voice={voice} />}
      {drag && (
        <>
          <path className="LinkLayer-curve" d={linkPath(drag.from, drag.to)} />
          <circle
            className="LinkLayer-end"
            cx={drag.to.x}
            cy={drag.to.y}
            r="5"
          />
        </>
      )}
    </svg>
  )
}
