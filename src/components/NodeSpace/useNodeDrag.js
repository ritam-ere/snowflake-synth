import { useEffect, useRef, useState } from 'react'

import { dropTarget } from './dropTarget.js'

// Перетаскивание ноды за бейдж (задача 5.2).
// Нода едет за указателем копией (призрак), а на её месте в колонках —
// плейсхолдер. Пока тянем, нода сразу переставляется в состоянии ядра
// (MOVE_NODE), поэтому плейсхолдер показывает, куда она ляжет.
// Перестановка на звук и связи не влияет: эффекты подключены параллельно.
// Esc — вернуть ноду на исходное место.

const THRESHOLD = 4
const EDGE = 48
const SCROLL_SPEED = 12

function measure(container) {
  return [...container.querySelectorAll('.NodeSpace-column')].map((column) => {
    const rect = column.getBoundingClientRect()
    return {
      left: rect.left,
      right: rect.right,
      cards: [...column.querySelectorAll(':scope > [data-node-id]')].map(
        (card) => {
          const r = card.getBoundingClientRect()
          return { id: card.dataset.nodeId, top: r.top, bottom: r.bottom }
        }
      )
    }
  })
}

function positionOf(columns, nodeId) {
  const column = columns.findIndex((c) => c.includes(nodeId))
  return { column, index: columns[column].indexOf(nodeId) }
}

export default function useNodeDrag(state, dispatch, containerRef) {
  const [dragging, setDragging] = useState(null)
  const session = useRef(null)
  const columns = useRef(state.layout.columns)
  columns.current = state.layout.columns

  function startNodeDrag(nodeId, event) {
    if (event.button !== 0) return
    event.preventDefault()
    session.current = {
      nodeId,
      startX: event.clientX,
      startY: event.clientY,
      origin: positionOf(columns.current, nodeId),
      ghost: null,
      offset: null,
      pointer: { x: event.clientX, y: event.clientY },
      started: false
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    window.addEventListener('keydown', handleKey)
  }

  function begin() {
    const s = session.current
    const card = containerRef.current.querySelector(
      `[data-node-id="${s.nodeId}"]`
    )
    const rect = card.getBoundingClientRect()
    s.offset = { x: s.startX - rect.left, y: s.startY - rect.top }

    // Призрак: копия карточки поверх всего, указатель не перехватывает
    const ghost = card.cloneNode(true)
    ghost.classList.add('Fx-ghost')
    ghost.removeAttribute('data-node-id')
    ghost.style.width = `${rect.width}px`
    ghost.style.height = `${rect.height}px`
    document.body.appendChild(ghost)
    s.ghost = ghost

    s.started = true
    document.body.classList.add('is-moving-node')
    setDragging(s.nodeId)
  }

  function place() {
    const s = session.current
    if (!s?.ghost) return
    s.ghost.style.transform = `translate(${s.pointer.x - s.offset.x}px, ${
      s.pointer.y - s.offset.y
    }px)`

    const target = dropTarget(
      measure(containerRef.current),
      s.nodeId,
      s.pointer.x,
      s.pointer.y
    )
    const current = positionOf(columns.current, s.nodeId)
    if (target.column !== current.column || target.index !== current.index) {
      dispatch({
        type: 'MOVE_NODE',
        nodeId: s.nodeId,
        toColumn: target.column,
        toIndex: target.index
      })
    }
  }

  function handleMove(event) {
    const s = session.current
    if (!s) return
    s.pointer = { x: event.clientX, y: event.clientY }

    if (!s.started) {
      const moved = Math.hypot(
        event.clientX - s.startX,
        event.clientY - s.startY
      )
      if (moved < THRESHOLD) return
      begin()
    }
    place()
  }

  function finish(cancel) {
    const s = session.current
    if (!s) return
    if (cancel && s.started) {
      dispatch({
        type: 'MOVE_NODE',
        nodeId: s.nodeId,
        toColumn: s.origin.column,
        toIndex: s.origin.index
      })
    }
    s.ghost?.remove()
    session.current = null
    document.body.classList.remove('is-moving-node')
    setDragging(null)

    window.removeEventListener('pointermove', handleMove)
    window.removeEventListener('pointerup', handleUp)
    window.removeEventListener('pointercancel', handleUp)
    window.removeEventListener('keydown', handleKey)
  }

  function handleUp() {
    finish(false)
  }

  function handleKey(event) {
    if (event.key === 'Escape') finish(true)
  }

  // Автопрокрутка поля нод, когда указатель у верхнего или нижнего края
  useEffect(() => {
    if (!dragging) return
    let frame

    function scroll() {
      const s = session.current
      const container = containerRef.current
      if (s && container) {
        const rect = container.getBoundingClientRect()
        let dy = 0
        if (s.pointer.y < rect.top + EDGE) dy = -SCROLL_SPEED
        else if (s.pointer.y > rect.bottom - EDGE) dy = SCROLL_SPEED
        if (dy) {
          container.scrollTop += dy
          place()
        }
      }
      frame = requestAnimationFrame(scroll)
    }

    frame = requestAnimationFrame(scroll)
    return () => cancelAnimationFrame(frame)
  }, [dragging])

  // Уход со страницы во время перетаскивания — убрать призрак
  useEffect(() => () => session.current?.ghost?.remove(), [])

  return { dragging, startNodeDrag }
}
