import React, { useEffect, useRef } from 'react'

import {
  SHAPES,
  breath,
  candidateColumns,
  cellsPerBeat,
  ease,
  pickColumn,
  pulseTravel,
  shapeFor,
  variantCells,
  variantRadius,
  voiceLook,
  weightOf
} from '../../core/snowfall.js'
import { VOICE_IDS } from '../../core/voices.js'

// Снегопад в панели слева (прототип). Каждая нота голоса выпускает
// пиксельную снежинку; она плавно падает и уходит за нижний край.
// Скорость пульсирует на долях такта синтезатора — снег идёт в ритм.
// У каждой снежинки свой вес: тяжёлые падают быстрее. Новая снежинка
// выбирает место, где ни с кем не столкнётся.
//
// Эффекты голоса сразу меняют все его снежинки, и уже летящие тоже
// (core/snowfall.js): форму — размер, ореол, шипы, шум, двойник — и
// полёт — качание, вращение, эхо-копии. Все снежинки пока белые.

// Летящие снежинки никогда не убираются раньше времени — каждая
// долетает до низа. Когда на экране тесно, реже выпускаем новые
const FULL = 70
// Не чаще одной снежинки за столько секунд от голоса
const MIN_GAP = { lead: 0.4, bass: 0.8, extra: 0.5 }
const COLOR = '#ffffff'

// Спрайт снежинки с вариациями: клетки cell × cell, без сглаживания
function renderSprite(index, variant, cell, dpr) {
  const R = variantRadius(index, variant)
  const side = (R * 2 + 1) * cell
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(side * dpr)
  canvas.height = Math.round(side * dpr)
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  ctx.fillStyle = COLOR
  variantCells(index, variant).forEach(([x, y]) => {
    ctx.fillRect((x + R) * cell, (y + R) * cell, cell, cell)
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
    let width = 0
    let height = 0
    let dpr = 1
    let cell = 5
    let now = 0
    let beat = 0
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

    function sprite(index, variant) {
      const key = [
        index,
        variant.halo,
        variant.haloDotted,
        variant.spikes,
        variant.noise,
        variant.noiseSeed,
        variant.echo,
        cell,
        dpr
      ].join('|')
      if (!sprites.has(key)) {
        if (sprites.size > 600) sprites.clear()
        sprites.set(key, renderSprite(index, variant, cell, dpr))
      }
      return sprites.get(key)
    }

    // Колонка внутри панели с отступом от закруглённых краёв
    function keepInside(col, r) {
      const margin = r + 4
      return Math.min(columns() - margin - 1, Math.max(margin, col))
    }

    function launch(note) {
      const look = voiceLook(stateRef.current, note.voice)
      if (now - (lastLaunch[note.voice] ?? -1) < MIN_GAP[note.voice]) return
      if (flakes.length >= FULL) return
      // Медленный снег живёт дольше — выпускаем его реже, чтобы
      // плотность по всей высоте оставалась ровной
      if (Math.random() > Math.min(1, look.lightness)) return
      lastLaunch[note.voice] = now

      const pan = stateRef.current.voices[note.voice].pan
      const index = shapeFor(note.voice, note.midi, look.sizeShift)
      const r = variantRadius(index, look)
      const base = cellsPerBeat(weightOf(index, Math.random()))
      const speed = base * look.lightness

      const col = pickColumn(candidateColumns(columns(), r, pan), flakes, {
        r: r + look.wobble + look.double,
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
        // параметры эффектов плавно догоняют текущие значения голоса
        lightness: look.lightness,
        wobble: look.wobble,
        double: look.double,
        tremor: look.tremor,
        swingAmp: 0,
        wobblePhase: Math.random(),
        doublePhase: Math.random(),
        spinPhase: Math.random(),
        tremorPhase: Math.random() * Math.PI * 2,
        side: Math.random() < 0.5 ? -1 : 1
      })
    }

    // Движение и вид за кадр: dBeats — сколько долей прошло, travel —
    // путь с пульсацией на долях, dt — секунды (для плавной смены)
    function move(flake, look, dBeats, travel, dt) {
      flake.lightness = ease(flake.lightness, look.lightness, dt)
      flake.wobble = ease(flake.wobble, calm ? 0 : look.wobble, dt)
      flake.double = ease(flake.double, look.double, dt)
      flake.tremor = ease(flake.tremor, calm ? 0 : look.tremor, dt)
      // Phaser: вращение туда-обратно, Oct — шире размах
      const swing = look.spin > 0 ? Math.PI * (0.25 + 0.75 * look.swing) : 0
      flake.swingAmp = ease(flake.swingAmp, calm ? 0 : swing, dt)

      // Pitch Shift меняет размер сразу у всех снежинок голоса
      flake.index = shapeFor(flake.voice, flake.midi, look.sizeShift)
      flake.r = variantRadius(flake.index, look)

      flake.speed = flake.base * flake.lightness
      flake.row += flake.speed * (calm ? dBeats * 0.6 : travel)

      flake.wobblePhase += look.wobbleRate * dBeats
      flake.doublePhase += look.doubleRate * dBeats
      flake.spinPhase += Math.max(look.spin, 0.06) * dBeats
      flake.tremorPhase += Math.PI * 2 * 6 * dBeats

      flake.x =
        flake.col +
        flake.wobble * Math.sin(Math.PI * 2 * flake.wobblePhase) +
        flake.tremor *
          Math.sin(flake.tremorPhase) *
          Math.sin(flake.tremorPhase * 0.37)
      flake.angle = flake.swingAmp * Math.sin(Math.PI * 2 * flake.spinPhase)
    }

    // Рисует снежинку с центром в клетке (x, y) с поворотом angle
    function draw(image, side, x, y, angle) {
      const s = side * dpr
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.translate(Math.round(x * cell * dpr), Math.round(y * cell * dpr))
      if (Math.abs(angle) > 0.001) ctx.rotate(angle)
      ctx.drawImage(image, -Math.round(s / 2), -Math.round(s / 2), s, s)
    }

    function render(flake, look) {
      const variant = {
        halo: look.halo,
        haloDotted: look.haloDotted,
        spikes: look.spikes,
        noise: look.noise,
        noiseSeed: look.flicker ? Math.floor(beat * look.flicker) % 4 : 0,
        echo: false
      }
      const { canvas: image, side } = sprite(flake.index, variant)

      // Delay: эхо-копии над снежинкой — там, где она была долю назад
      // (Time L / R по очереди); Ping-Pong — копии вразлёт влево и вправо
      if (look.echoes > 0) {
        const ghost = sprite(flake.index, { ...variant, echo: true })
        let gap = 0
        for (let k = 1; k <= look.echoes; k++) {
          gap += flake.speed * look.echoBeats[(k - 1) % 2]
          const shift = look.pingPong ? (k % 2 ? -1 : 1) * (2 + k * 2) : 0
          draw(
            ghost.canvas,
            ghost.side,
            flake.x + shift,
            flake.row - gap,
            flake.angle
          )
        }
      }

      // Chorus: двойник рядом, «дышит» — то отходит, то приближается
      if (flake.double > 0.2) {
        const d = flake.double * breath(look.doubleWave, flake.doublePhase)
        draw(image, side, flake.x + flake.side * d, flake.row, -flake.angle)
      }

      draw(image, side, flake.x, flake.row, flake.angle)
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
        beat = beats
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
        const look = looks[flake.voice]
        move(flake, look, dBeats, travel, dt)
        // Уходит за нижний край целиком (вместе с эхо) — и всё, без затухания
        const tail = look.echoes > 0 ? flake.speed * 2 * look.echoes : 0
        if (flake.row - flake.r - tail > bottom) return false
        render(flake, look)
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
