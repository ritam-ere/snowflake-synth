import React, { useEffect, useRef, useState } from 'react'

import { linkPath } from './linkPath.js'

// Режим связей (задача 4.4): пока плашка голоса открыта, от её точки
// идут линии ко всем лампочкам этого голоса на нодах.
//
// Координаты читаются из DOM на каждом кадре requestAnimationFrame,
// поэтому линии не отстают ни при ресайзе окна, ни при прокрутке поля
// нод, ни во время анимации сворачивания панели. React перерисовывает
// слой только когда координаты действительно изменились.

function measure(voice) {
  const tab = document.querySelector(`[data-voice-tab="${voice}"]`)
  const space = document.querySelector('.NodeSpace-columns')
  if (!tab || !space) return []

  const t = tab.getBoundingClientRect()
  const from = { x: t.left + t.width / 2, y: t.bottom }
  const view = space.getBoundingClientRect()

  return [...document.querySelectorAll(`[data-lamp="${voice}"]`)]
    .map((lamp) => {
      const r = lamp.getBoundingClientRect()
      const to = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      // Лампочка прокручена за край поля нод — линию не рисуем
      const visible = to.y >= view.top && to.y <= view.bottom
      return visible ? linkPath(from, to) : null
    })
    .filter(Boolean)
}

export default function LinkLines({ voice }) {
  const [paths, setPaths] = useState([])
  const last = useRef('')

  useEffect(() => {
    let frame

    function tick() {
      const next = measure(voice)
      const key = next.join('|')
      if (key !== last.current) {
        last.current = key
        setPaths(next)
      }
      frame = requestAnimationFrame(tick)
    }

    tick()
    return () => cancelAnimationFrame(frame)
  }, [voice])

  return (
    <g className="LinkLines">
      {paths.map((d, i) => (
        <path key={i} className="LinkLayer-curve is-line" d={d} />
      ))}
    </g>
  )
}
