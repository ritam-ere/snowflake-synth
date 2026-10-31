import React, { useEffect, useRef } from 'react'

import {
  flakeShape,
  flakeSize,
  spawnX,
  voiceLook
} from '../../core/snowfall.js'

// Снегопад в панели слева (прототип). Каждая нота голоса выпускает
// снежинку из круглых пикселей в цвете голоса; эффекты голоса меняют
// только её полёт и свет (core/snowfall.js). Рисуется на canvas:
// каждая снежинка один раз рендерится в маленький спрайт, дальше
// кадр — это перенос спрайтов, поэтому сотни снежинок идут в 60 fps.

const MAX_FLAKES = 55
// Не чаще одной снежинки за столько секунд от голоса: бас играет
// часто, иначе снег слипается в сугроб
const MIN_GAP = { lead: 0.45, bass: 0.9, extra: 0.55 }
const FADE_IN = 0.35 // с
const FADE_OUT = 0.22 // нижняя доля панели, где снежинка тает
const TRAIL_STEP = 0.22 // с между точками шлейфа
const VOICE_SALT = { lead: 1201, bass: 3407, extra: 5813 }

function cssColor(name) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// Смесь цвета с белым: k = 0 — цвет голоса, k = 1 — белый
function tint([r, g, b], k) {
  const m = (c) => Math.round(c + (255 - c) * k)
  return `rgb(${m(r)}, ${m(g)}, ${m(b)})`
}

// Спрайт снежинки: круглые пиксели, серединка светлее краёв, мягкое
// свечение цвета голоса. hot — светлый вариант для мерцания
function renderSprite(dots, size, pitch, rgb, hot, dpr) {
  const radius = (size + 1) * pitch
  const pad = pitch * 1.5
  const side = Math.ceil((radius + pad) * 2 * dpr)
  const canvas = document.createElement('canvas')
  canvas.width = side
  canvas.height = side
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  ctx.translate(side / dpr / 2, side / dpr / 2)
  ctx.shadowBlur = pitch * 0.6
  ctx.shadowColor = `rgba(${rgb.join(', ')}, 0.45)`

  dots.forEach((dot) => {
    const light = hot ? 0.75 : 0.5 * (1 - dot.ring / size) ** 1.5
    ctx.fillStyle = tint(rgb, light)
    ctx.beginPath()
    ctx.arc(dot.x * pitch, dot.y * pitch, pitch * 0.34, 0, Math.PI * 2)
    ctx.fill()
  })
  return { canvas, side: side / dpr }
}

export default function Snowfall({ engine, state }) {
  const canvasRef = useRef(null)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const colors = {
      lead: hexToRgb(cssColor('--voice-lead')),
      bass: hexToRgb(cssColor('--voice-bass')),
      extra: hexToRgb(cssColor('--voice-extra'))
    }
    const sprites = new Map()
    let flakes = []
    let pending = []
    let width = 0
    let height = 0
    let dpr = 1
    let now = 0

    // Размер пикселя — от ширины панели (в свёрнутой панели мельче)
    const pitch = () => Math.min(6, Math.max(2.2, width / 50))

    function resize() {
      const rect = canvas.getBoundingClientRect()
      dpr = window.devicePixelRatio || 1
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      sprites.clear()
    }

    function sprite(voice, seed, size, hot) {
      const p = pitch()
      const key = `${voice}|${seed}|${size}|${hot}|${p}`
      if (!sprites.has(key)) {
        if (sprites.size > 400) sprites.clear()
        sprites.set(
          key,
          renderSprite(flakeShape(seed, size), size, p, colors[voice], hot, dpr)
        )
      }
      return sprites.get(key)
    }

    const lastLaunch = {}

    function launch(note, echo = 0, side = 0, at = null) {
      if (echo === 0) {
        if (now - (lastLaunch[note.voice] ?? -1) < MIN_GAP[note.voice]) return
        lastLaunch[note.voice] = now
      }
      const look = voiceLook(stateRef.current, note.voice)
      const settings = stateRef.current.voices[note.voice]
      const size = flakeSize(note.voice, note.midi)
      // Одна и та же нота — одна и та же снежинка: повторы мелодии
      // повторяют узор
      const seed = ((note.midi * 7919 + VOICE_SALT[note.voice]) % 9973) / 9973
      const scale = look.scale * 0.85 ** echo
      const radius = (size + 1) * pitch() * scale
      const x = at ?? spawnX(note.midi, settings.pan, Math.random()) * width

      flakes.push({
        voice: note.voice,
        seed,
        size,
        scale,
        x: Math.min(width - radius, Math.max(radius, x + side)),
        y: -radius,
        vy: (height + radius * 2) / (8 + Math.random() * 2.5),
        born: now,
        phase: Math.random() * Math.PI * 2,
        rot: Math.random() * Math.PI,
        sway: calm ? 0 : look.sway * radius,
        swayRate: look.swayRate,
        spin: calm ? 0 : look.spin * (Math.random() < 0.5 ? -1 : 1),
        trail: calm
          ? 0
          : Math.max(1, Math.round(look.trail * 3)) * (look.trail > 0),
        twinkle: look.twinkle,
        alpha: (0.55 + 0.45 * note.velocity) * 0.6 ** echo,
        history: []
      })
      if (flakes.length > MAX_FLAKES) flakes.shift()

      // Эхо-снежинки Delay: через долю такта, слабее и мельче;
      // при Ping-Pong — по очереди влево и вправо
      if (echo === 0 && !calm) {
        const beat = 60 / note.bpm
        for (let k = 1; k <= look.echoes; k++) {
          const shift = look.pingPong ? (k % 2 ? -1 : 1) * width * 0.16 * k : 0
          pending.push({
            at: now + k * beat * look.echoBeats,
            note,
            k,
            shift,
            x
          })
        }
      }
    }

    function draw(flake, x, y, rot, alpha, hot, shrink = 1) {
      const { canvas: image, side } = sprite(
        flake.voice,
        flake.seed,
        flake.size,
        hot
      )
      const s = side * flake.scale * shrink
      ctx.globalAlpha = alpha
      ctx.setTransform(dpr, 0, 0, dpr, x * dpr, y * dpr)
      ctx.rotate(rot)
      ctx.drawImage(image, -s / 2, -s / 2, s, s)
    }

    let frame
    let last = performance.now()

    function tick(time) {
      const dt = Math.min(0.05, (time - last) / 1000)
      last = time
      now += dt

      pending = pending.filter((p) => {
        if (p.at > now) return true
        launch(p.note, p.k, p.shift, p.x)
        return false
      })

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // Пересечения снежинок светятся ярче, а не смешиваются в кашу
      ctx.globalCompositeOperation = 'lighter'

      flakes = flakes.filter((flake) => {
        const age = now - flake.born
        flake.y += flake.vy * dt
        flake.rot += flake.spin * Math.PI * 2 * dt
        const x =
          flake.x +
          flake.sway *
            Math.sin(Math.PI * 2 * flake.swayRate * age + flake.phase)

        // Появление и таяние внизу панели
        const fadeIn = Math.min(1, age / FADE_IN)
        const fadeOut = Math.min(1, (height - flake.y) / (height * FADE_OUT))
        if (fadeOut <= 0) return false
        let alpha = flake.alpha * fadeIn * fadeOut

        // Шлейф Reverb: несколько прежних положений, всё прозрачнее
        if (flake.trail > 0) {
          const h = flake.history
          if (!h.length || age - h[h.length - 1].age >= TRAIL_STEP) {
            h.push({ x, y: flake.y, rot: flake.rot, age })
            if (h.length > flake.trail) h.shift()
          }
          h.forEach((p, i) => {
            const k = (i + 1) / (h.length + 1)
            draw(flake, p.x, p.y, p.rot, alpha * 0.22 * k, false, 0.8 + 0.2 * k)
          })
        }

        // Мерцание Distortion: пиксели то вспыхивают, то гаснут
        let hot = false
        if (flake.twinkle > 0) {
          alpha *= 1 - flake.twinkle * 0.45 * Math.random()
          hot = Math.random() < flake.twinkle * 0.12
        }

        draw(flake, x, flake.y, flake.rot, alpha, hot)
        return true
      })

      ctx.globalAlpha = 1
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
