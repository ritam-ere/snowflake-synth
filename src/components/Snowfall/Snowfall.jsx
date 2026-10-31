import React, { useEffect, useRef } from 'react'

import {
  SHAPES,
  candidateColumns,
  cellsPerBeat,
  ease,
  echoColumn,
  pickColumn,
  pulseTravel,
  shapeCells,
  shapeFor,
  voiceLook,
  weightOf
} from '../../core/snowfall.js'
import { VOICE_IDS } from '../../core/voices.js'

// Снегопад в панели слева (прототип). Каждая нота голоса выпускает
// пиксельную снежинку; она плавно падает и уходит за нижний край.
// Скорость пульсирует на долях такта синтезатора — снег идёт в ритм.
// У каждой снежинки свой вес: тяжёлые падают быстрее. Новая снежинка
// выбирает место, где ни с кем не столкнётся. Эффекты голоса меняют
// падение (core/snowfall.js), и уже летящие снежинки тоже: подключили
// эффект или покрутили контрол — снег плавно перестраивается.
// Все снежинки пока белые.

// Сколько снежинок может лететь одновременно. Летящие снежинки никогда
// не убираются раньше времени — каждая долетает до низа и уходит за край.
// Когда эффекты замедляют снег (Reverb) или добавляют эхо (Delay), на
// экране становится теснее: тогда реже выпускаем новые
const CROWDED = 55 // дальше эхо Delay не выпускается
const FULL = 80 // дальше не выпускается ничего, пока снег не поредеет
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
    let lastBeats = null

    const columns = () => Math.floor(width / cell)

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
      const look = voiceLook(stateRef.current, note.voice)
      if (echo === 0) {
        if (now - (lastLaunch[note.voice] ?? -1) < MIN_GAP[note.voice]) return
        if (flakes.length >= FULL) return
        // Медленный снег живёт дольше — выпускаем его реже, чтобы
        // плотность по всей высоте оставалась ровной
        if (Math.random() > Math.min(1, look.lightness)) return
        lastLaunch[note.voice] = now
      } else if (flakes.length >= CROWDED) {
        return
      }

      const pan = stateRef.current.voices[note.voice].pan
      const index = shapeFor(note.voice, note.midi, look.sizeShift)
      const r = SHAPES[index].r
      const cols = columns()
      const base = cellsPerBeat(weightOf(index, Math.random()))
      const speed = base * look.lightness

      // Кандидаты — по всей ширине, а для эха — рядом с его местом
      const candidates =
        near === null
          ? candidateColumns(cols, r, pan)
          : [-2, -1, 0, 1, 2].map((d) => keepInside(near + d * 2, r))
      const col = pickColumn(candidates, flakes, {
        r: r + look.wobble,
        speed,
        topRows: (r + 3) * 3
      })

      flakes.push({
        voice: note.voice,
        midi: note.midi,
        index,
        r,
        col,
        row: -r - 1,
        base,
        speed,
        x: col,
        // параметры эффектов — плавно догоняют текущие значения голоса
        lightness: look.lightness,
        wobble: look.wobble,
        drift: look.drift,
        tremor: look.tremor,
        phase: Math.random() * Math.PI * 2,
        tremorPhase: Math.random() * Math.PI * 2,
        driftDir: Math.random() < 0.5 ? -1 : 1
      })

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

    // Движение за кадр: dBeats — сколько долей прошло, travel — путь
    // с пульсацией на долях, dt — секунды (для плавной смены эффектов)
    function move(flake, look, dBeats, travel, dt) {
      flake.lightness = ease(flake.lightness, look.lightness, dt)
      flake.wobble = ease(flake.wobble, calm ? 0 : look.wobble, dt)
      flake.drift = ease(flake.drift, calm ? 0 : look.drift, dt)
      flake.tremor = ease(flake.tremor, calm ? 0 : look.tremor, dt)

      // Pitch Shift меняет размер сразу у всех снежинок голоса
      flake.index = shapeFor(flake.voice, flake.midi, look.sizeShift)
      flake.r = SHAPES[flake.index].r

      flake.speed = flake.base * flake.lightness
      flake.row += flake.speed * (calm ? dBeats * 0.6 : travel)

      // Снос Phaser: у края ветер разворачивает снежинку обратно
      flake.col += flake.drift * flake.driftDir * dBeats
      const inside = keepInside(flake.col, flake.r)
      if (inside !== flake.col) {
        flake.col = inside
        flake.driftDir *= -1
      }

      flake.phase += Math.PI * 2 * look.wobbleRate * dBeats
      flake.tremorPhase += Math.PI * 2 * 6 * dBeats
      flake.x =
        flake.col +
        flake.wobble * Math.sin(flake.phase) +
        flake.tremor *
          Math.sin(flake.tremorPhase) *
          Math.sin(flake.tremorPhase * 0.37)
    }

    let frame
    let last = performance.now()

    function tick(time) {
      const dt = Math.min(0.05, (time - last) / 1000)
      last = time
      now += dt

      // Ход транспорта за кадр; после свёрнутой вкладки — не больше доли
      const beats = engine.beats()
      let dBeats = 0
      let travel = 0
      if (beats !== null) {
        if (lastBeats === null || beats < lastBeats) lastBeats = beats
        const from = Math.max(lastBeats, beats - 1)
        dBeats = beats - from
        travel = pulseTravel(from, beats)
        lastBeats = beats

        pending = pending.filter((p) => {
          if (p.at > beats) return true
          launch(p.note, p.k, p.col)
          return false
        })
      }

      const looks = {}
      VOICE_IDS.forEach((voice) => {
        looks[voice] = voiceLook(stateRef.current, voice)
      })

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.imageSmoothingEnabled = false
      const bottom = height / cell

      flakes = flakes.filter((flake) => {
        move(flake, looks[flake.voice], dBeats, travel, dt)
        // Уходит за нижний край целиком — и всё, без затухания
        if (flake.row - flake.r > bottom) return false
        const { canvas: image, side } = sprite(flake.index)
        // Плавно, но по целым точкам экрана — пиксели остаются чёткими
        const x = Math.round((flake.x - flake.r) * cell * dpr)
        const y = Math.round((flake.row - flake.r) * cell * dpr)
        ctx.drawImage(image, x, y, side * dpr, side * dpr)
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
