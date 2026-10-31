import React, { useEffect, useRef } from 'react'

import {
  SHAPES,
  candidateColumns,
  cellsPerStep,
  echoColumn,
  pickColumn,
  shapeCells,
  shapeFor,
  stepCells,
  voiceLook,
  weightOf
} from '../../core/snowfall.js'

// Снегопад в панели слева (прототип). Каждая нота голоса выпускает
// пиксельную снежинку; она падает по сетке ступеньками, как фигура
// в тетрисе, и уходит за нижний край. Шаги идут по шестнадцатым долям
// такта синтезатора, на сильных долях — шире: снег качается в ритм.
// У каждой снежинки свой вес: тяжёлые падают быстрее. Новая снежинка
// выбирает место, где ни с кем не столкнётся. Эффекты голоса меняют
// только падение (core/snowfall.js). Все снежинки пока белые.

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
    let lastSixteenth = null

    const columns = () => Math.floor(width / cell)
    const rows = () => Math.ceil(height / cell)

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

    // Колонка внутри панели с отступом от закруглённых краёв
    function keepInside(col, r) {
      const margin = r + 4
      return Math.min(columns() - margin - 1, Math.max(margin, col))
    }

    function launch(note, echo = 0, near = null) {
      if (echo === 0) {
        if (now - (lastLaunch[note.voice] ?? -1) < MIN_GAP[note.voice]) return
        lastLaunch[note.voice] = now
      }

      const look = voiceLook(stateRef.current, note.voice)
      const pan = stateRef.current.voices[note.voice].pan
      const index = shapeFor(note.voice, note.midi, look.sizeShift)
      const r = SHAPES[index].r
      const cols = columns()
      const speed = cellsPerStep(weightOf(index, Math.random()), look.lightness)
      const wobble = calm ? 0 : look.wobble

      // Кандидаты — по всей ширине, а для эха — рядом с его местом
      const candidates =
        near === null
          ? candidateColumns(cols, r, pan)
          : [-2, -1, 0, 1, 2].map((d) => keepInside(near + d * 2, r))
      const col = pickColumn(candidates, flakes, {
        r: r + wobble,
        speed,
        topRows: (r + 3) * 3
      })

      flakes.push({
        index,
        r,
        col,
        row: -r - 1,
        speed: calm ? 1 : speed,
        steps: 0,
        offset: 0,
        wobble,
        wobbleSteps: look.wobbleSteps,
        phase: Math.floor(Math.random() * 4 * look.wobbleSteps),
        drift: calm ? 0 : look.drift,
        driftDir: Math.random() < 0.5 ? -1 : 1,
        jitter: calm ? 0 : look.jitter
      })
      if (flakes.length > MAX_FLAKES) flakes.shift()

      // Эхо-снежинки Delay: та же форма через долю такта — зеркально
      // на другой половине панели (Ping-Pong) или рядом
      if (echo === 0 && !calm && look.echoes > 0) {
        const beat = engine.beats() ?? 0
        let from = col
        for (let k = 1; k <= look.echoes; k++) {
          from = echoColumn(from, cols, look.pingPong, k, Math.random())
          pending.push({ at: beat + k * look.echoBeats, note, k, col: from })
        }
      }
    }

    // Шаг вниз на шестнадцатой доле; качание, снос и рывки — по клеткам
    function stepDown(flake, sixteenth) {
      flake.row += stepCells(flake.speed, sixteenth)
      flake.steps += 1
      let offset = 0
      if (flake.wobble > 0) {
        const t = (flake.steps + flake.phase) / (2 * flake.wobbleSteps)
        offset = Math.round(flake.wobble * Math.sin(Math.PI * 2 * t))
      }
      if (flake.drift > 0 && flake.steps % flake.drift === 0) {
        const next = keepInside(flake.col + flake.driftDir, flake.r)
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
      now += Math.min(0.05, (time - last) / 1000)
      last = time

      // Сколько шестнадцатых прошло с прошлого кадра — столько шагов
      const beats = engine.beats()
      if (beats !== null) {
        const sixteenth = Math.floor(beats * 4)
        if (lastSixteenth === null || sixteenth < lastSixteenth) {
          lastSixteenth = sixteenth
        }
        // после свёрнутой вкладки не догоняем больше двух долей
        const from = Math.max(lastSixteenth + 1, sixteenth - 8)
        for (let i = from; i <= sixteenth; i++) {
          flakes.forEach((flake) => stepDown(flake, i))
        }
        lastSixteenth = sixteenth

        pending = pending.filter((p) => {
          if (p.at > beats) return true
          launch(p.note, p.k, p.col)
          return false
        })
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.imageSmoothingEnabled = false
      const bottom = rows()

      flakes = flakes.filter((flake) => {
        // Уходит за нижний край целиком — и всё, без затухания
        if (flake.row - flake.r > bottom) return false
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
