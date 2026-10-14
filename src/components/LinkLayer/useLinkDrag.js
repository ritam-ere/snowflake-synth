import { useEffect, useRef, useState } from 'react'

// Протягивание связи от нижней зоны плашки голоса к ноде (задача 4.3).
// Мышь и тач — через Pointer Events. Пока тянем, кривая цвета голоса
// идёт за указателем, нода под ним подсвечивается. Отпустили над нодой —
// связь создаётся (LINK), мимо или Esc — отмена.
//
// Возвращает drag ({ voice, from, to, target } или null) и startDrag

// Нода под указателем: у карточки ноды есть data-node-id
function nodeAt(x, y) {
  const element = document.elementFromPoint(x, y)
  return element?.closest('[data-node-id]')?.dataset.nodeId ?? null
}

// Точка голоса: нижний центр плашки
function voiceAnchor(voice) {
  const tab = document.querySelector(`[data-voice-tab="${voice}"]`)
  const rect = tab.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.bottom }
}

export default function useLinkDrag(dispatch) {
  const [drag, setDrag] = useState(null)
  const current = useRef(null)

  function update(next) {
    current.current = next
    setDrag(next)
  }

  function startDrag(voice, event) {
    if (event.button !== 0) return
    event.preventDefault()
    update({
      voice,
      from: voiceAnchor(voice),
      to: { x: event.clientX, y: event.clientY },
      target: null
    })
  }

  useEffect(() => {
    if (!drag) return

    function handleMove(event) {
      const d = current.current
      update({
        ...d,
        to: { x: event.clientX, y: event.clientY },
        target: nodeAt(event.clientX, event.clientY)
      })
    }

    function handleUp(event) {
      const d = current.current
      const target = nodeAt(event.clientX, event.clientY)
      if (target) dispatch({ type: 'LINK', voice: d.voice, nodeId: target })
      update(null)
    }

    function handleCancel() {
      update(null)
    }

    function handleKey(event) {
      if (event.key === 'Escape') update(null)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleCancel)
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleCancel)
      window.removeEventListener('keydown', handleKey)
    }
    // Слушатели нужны, пока идёт перетаскивание
  }, [drag !== null])

  return { drag, startDrag }
}
