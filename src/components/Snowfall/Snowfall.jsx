import React, { useEffect, useRef } from 'react'

import {
  SHAPES,
  shapeCells,
  shapeFor,
  spawnX,
  stepSeconds,
  voiceLook,
  weightOf
} from '../../core/snowfall.js'

// Снегопад в панели слева (прототип). Каждая нота голоса выпускает
// пиксельную снежинку; она падает по сетке ступеньками, как фигура
// в тетрисе, и уходит за нижний край. У каждой снежинки свой вес:
// тяжёлые падают быстрее. Эффекты голоса меняют только падение
// (core/snowfall.js). Все снежинки пока белые.

const MAX_FLAKES = 70
// Не чаще одной снежинки за столько секунд от голоса: бас играет
// часто, иначе снег слипается в сугроб
const MIN_GAP = { lead: 0.4, bass: 0.8, extra: 0.5 }
const COLOR = '#ffffff'

// Спрайт формы: клетки cell × cell, без сглаживания
function renderSprite(index, cell, dpr) {
  const r = SHAPES[index].r
  const side = (r * 2 + 1) * cell
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(side * dpr)
  canvas.height = Math.round(side * dpr)
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  ctx.fillStyle = COLOR
  shapeCells(index).forEach(([x, y]) => {
    ctx.fillRect((x + r) * cell, (y + r) * cell, cell, cell)
  })
  return { canvas, side }
}

export default function Snowfall({ engine, state }) {
  const canvasRef = useRef(null)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const sprites = new Map()
    const lastLaunch = {}
    let flakes = []
    let pending = []
    let width = 0
    let height = 0
    let dpr = 1
    let cell = 5
    let now = 0

    function resize() {
      const rect = canvas.getBoundingClientRect()
      dpr = window.devicePixelRatio || 1
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      // Размер пикселя снежинки — целое число точек экрана
      cell = Math.max(2, Math.floor(width / 56))
      sprites.clear()
    }

    function sprite(index) {
      const key = `${index}|${cell}|${dpr}`
      if (!sprites.has(key)) sprites.set(key, renderSprite(index, cell, dpr))
      return sprites.get(key)
    }

    // Снежинка целиком внутри панели, с отступом от закруглённых краёв
    // (качание — ещё до трёх клеток в сторону)
    function keepInside(col, r, cols) {
      const margin = r + 4
      return Math.min(cols - margin - 1, Math.max(margin, col))
    }

    // Свободное место у верхнего края: из нескольких случайных колонок
    // берём ту, что дальше всех от снежинок, которые ещё не отлетели
    function freeColumn(note, pan, r, cols) {
      let best = 0
      let bestGap = -1
      for (let k = 0; k < 8; k++) {
        const col = Math.round(spawnX(note.midi, pan, Math.random()) * cols)
        let gap = Infinity
        flakes.forEach((f) => {
          if (f.row - f.r > r * 3 + 4) return
          gap = Math.min(gap, Math.abs(f.col - col) - f.r - r)
        })
        if (gap > bestGap) {
          bestGap = gap
          best = col
        }
      }
      return best
    }

    function launch(note, echo = 0, shift = 0, from = null) {
      if (echo === 0) {
        if (now - (lastLaunch[note.voice] ?? -1) < MIN_GAP[note.voice]) return
        lastLaunch[note.voice] = now
      }

      const look = voiceLook(stateRef.current, note.voice)
      const pan = stateRef.current.voices[note.voice].pan
      const index = shapeFor(note.voice, note.midi, look.sizeShift)
      const r = SHAPES[index].r
      const cols = Math.floor(width / cell)
      const col = from ?? freeColumn(note, pan, r, cols)
      const weight = weightOf(index, Math.random())

      flakes.push({
        index,
        r,
        col: keepInside(col + shift, r, cols),
        cols,
        row: -r - 1,
        step: stepSeconds(weight, look.lightness) * (calm ? 1.6 : 1),
        timer: 0,
        steps: 0,
        offset: 0,
        wobble: calm ? 0 : look.wobble,
        wobbleSteps: look.wobbleSteps,
        phase: Math.floor(Math.random() * 4 * look.wobbleSteps),
        drift: calm ? 0 : look.drift,
        driftDir: Math.random() < 0.5 ? -1 : 1,
        jitter: calm ? 0 : look.jitter
      })
      if (flakes.length > MAX_FLAKES) flakes.shift()

      // Эхо-снежинки Delay: та же форма через долю такта; при Ping-Pong
      // по очереди левее и правее
      if (echo === 0 && !calm) {
        const beat = 60 / note.bpm
        for (let k = 1; k <= look.echoes; k++) {
          const side = look.pingPong
            ? (k % 2 ? -1 : 1) * Math.round(cols * 0.18) * k
            : 0
          pending.push({
            at: now + k * beat * look.echoBeats,
            note,
            k,
            side,
            col
          })
        }
      }
    }

    // Один шаг вниз на клетку; качание, снос и рывки — тоже по клеткам
    function stepDown(flake) {
      flake.row += 1
      flake.steps += 1
      let offset = 0
      if (flake.wobble > 0) {
        const t = (flake.steps + flake.phase) / (2 * flake.wobbleSteps)
        offset = Math.round(flake.wobble * Math.sin(Math.PI * 2 * t))
      }
      if (flake.drift > 0 && flake.steps % flake.drift === 0) {
        const next = keepInside(flake.col + flake.driftDir, flake.r, flake.cols)
        // упёрлась в край — ветер разворачивает её обратно
        if (next === flake.col) flake.driftDir *= -1
        flake.col = next
      }
      if (flake.jitter > 0 && Math.random() < flake.jitter) {
        offset += Math.random() < 0.5 ? -1 : 1
      }
      flake.offset = offset
    }

    let frame
    let last = performance.now()

    function tick(time) {
      const dt = Math.min(0.05, (time - last) / 1000)
      last = time
      now += dt

      pending = pending.filter((p) => {
        if (p.at > now) return true
        launch(p.note, p.k, p.side, p.col)
        return false
      })

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.imageSmoothingEnabled = false
      const rows = Math.ceil(height / cell)

      flakes = flakes.filter((flake) => {
        flake.timer += dt
        while (flake.timer >= flake.step) {
          flake.timer -= flake.step
          stepDown(flake)
        }
        // Уходит за нижний край целиком — и всё, без затухания
        if (flake.row - flake.r > rows) return false

        const { canvas: image, side } = sprite(flake.index)
        const x = (flake.col + flake.offset - flake.r) * cell
        const y = (flake.row - flake.r) * cell
        ctx.drawImage(image, x * dpr, y * dpr, side * dpr, side * dpr)
        return true
      })

      frame = requestAnimationFrame(tick)
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    const unsubscribe = engine.onNote((note) => launch(note))
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      unsubscribe()
    }
  }, [engine])

  return <canvas ref={canvasRef} className="Snowfall" aria-hidden="true" />
}
