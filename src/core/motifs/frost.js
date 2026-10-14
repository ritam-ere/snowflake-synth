// Стиль «Иней» (задача 6.3): ледяные веточки под 60°, шестиугольники,
// иголки и грани — как у настоящего кристалла снега. Таблица
// «параметр → узор» та же, что у «Геометрии». Каждая бумажная линия
// доходит до границы своей области.

import { EDGE_DEPTH, L, centerLimit, foldPoint } from '../snowflake.js'
import {
  TIME_RISE,
  WAVES,
  across,
  foldHole,
  hole,
  lace,
  noise,
  norm,
  paper,
  stem
} from './common.js'

const RAD60 = Math.PI / 3

// Отросток от точки p под углом a длиной len
function twig(p, a, len) {
  return [p, [p[0] + Math.sin(a) * len, p[1] + Math.cos(a) * len]]
}

// Иголка с «ёлочкой» колючек: основание p, направление a (от оси y)
function needle(p, a, len, w, barbs = 2) {
  const shapes = [paper(twig(p, a, len), w, { join: 'miter' })]
  for (let k = 1; k <= barbs; k++) {
    const q = twig(p, a, (len * k) / (barbs + 1))[1]
    const size = len * 0.28 * (1 - (k - 1) / (barbs + 1))
    shapes.push(paper(twig(q, a + RAD60, size), w * 0.75))
    shapes.push(paper(twig(q, a - RAD60, size), w * 0.75))
  }
  return shapes
}

// Reverb: ледяной папоротник — стебель с парами веточек под 60°.
// Decay — число пар (1–7), веточки короче к центру снежинки
function reverb(cut) {
  const { region } = cut
  const w = lace(cut)
  const count = 1 + Math.round(norm(cut, 'decay') * 6)
  const step = (region.y1 - region.y0 - 8) / (count + 0.3)
  const shapes = [hole(region.polygon), paper(stem(region), w)]

  for (let i = 0; i < count; i++) {
    const y = region.y1 - 4 - step * (i + 0.5)
    const { x, half } = across(region, y)
    const len = Math.min(step * 1.25 * 0.9 ** i, (half - 3) / Math.sin(RAD60))
    if (len < 5) break
    const barbs = len > 26 ? 1 : 0
    shapes.push(...needle([x, y], RAD60, len, w * 0.85, barbs))
    shapes.push(...needle([x, y], -RAD60, len, w * 0.85, barbs))
  }
  return shapes
}

// Delay: вложенные шестиугольники-эхо на стержне. Feedback — число
// контуров; Time L / R — ширина левой / правой половины; Ping-Pong —
// контуры через один повёрнуты на 30°
function delay(cut) {
  const { region } = cut
  const { timeL, timeR, pingPong } = cut.settings
  const count = 1 + Math.round(norm(cut, 'feedback') * 5)
  const w = lace(cut)
  const ym = (region.y0 + region.y1) / 2
  const { x, half } = across(region, ym)
  const R = Math.min(half - 2, (region.y1 - region.y0) / 2 - 2)
  const stretch = {
    left: TIME_RISE[timeL] / 0.6,
    right: TIME_RISE[timeR] / 0.6
  }
  const shapes = [hole(region.polygon), paper(stem(region), w)]

  for (let i = 0; i < count; i++) {
    const r = R * (1 - i / (count + 0.6))
    const turn = pingPong && i % 2 ? Math.PI / 6 : 0
    const points = Array.from({ length: 7 }, (_, k) => {
      const a = turn + k * RAD60
      const dx = Math.sin(a) * r
      const k2 = dx > 0 ? stretch.left : stretch.right
      return [x + dx * Math.min(k2, (half - 2) / r), ym + Math.cos(a) * r]
    })
    shapes.push(
      paper(points, Math.max(2.5, w * (1 - 0.08 * i)), { join: 'miter' })
    )
  }
  return shapes
}

// Pitch Shift: кристалл. Interval −12 / +7 / +12 — 4 / 5 / 6 лучей
// с колючками, в центре шестиугольник
function pitchShift(cut) {
  const { region } = cut
  const w = lace(cut)
  const rays = { [-12]: 4, 7: 5, 12: 6 }[cut.settings.interval]
  const ym = (region.y0 + region.y1) / 2
  const { x, half } = across(region, ym)
  const R = Math.max(8, Math.min(half, (region.y1 - region.y0) / 2))
  const turn = noise(cut.seed, 1) * Math.PI
  const hex = Array.from({ length: 7 }, (_, k) => [
    x + Math.sin(k * RAD60) * R * 0.22,
    ym + Math.cos(k * RAD60) * R * 0.22
  ])
  const shapes = [hole(region.polygon), paper(hex, w, { join: 'miter' })]

  for (let i = 0; i < rays; i++) {
    const a = turn + (2 * Math.PI * i) / rays
    // луч до границ области, колючки — на его видимой части
    shapes.push(paper(twig([x, ym], a, 400), w))
    shapes.push(...needle([x, ym], a, R * 0.95, w, 2).slice(1))
  }
  return shapes
}

// Опора кромки — вилка: от точки кромки вниз двумя ножками
function forks(xs, line, region, w, spread) {
  return xs.flatMap((x) => {
    const top = [x, line(x)]
    const mid = [x, (line(x) + region.y0) / 2]
    return [
      paper([top, mid], w),
      paper([mid, [x - spread, region.y0 - 10]], w * 0.8),
      paper([mid, [x + spread, region.y0 - 10]], w * 0.8)
    ]
  })
}

// Chorus: гранёная волна — та же волна ломаной из граней, на вилках.
// Depth — высота, Rate — число волн, Wave — форма
function chorus(cut) {
  const { region } = cut
  const { x0, x1 } = region
  const w = lace(cut)
  const waves = 1 + Math.round(norm(cut, 'rate') * 4)
  const amp = (0.25 + 0.75 * norm(cut, 'depth')) * (EDGE_DEPTH - 22)
  const shape = WAVES[cut.settings.wave]
  const line = (x) =>
    L - 4 - w / 2 - amp * shape(((x - x0) / (x1 - x0)) * waves)
  // по 4 грани на волну
  const facets = waves * 4
  const points = [[x0 - 10, line(x0)]]
  for (let i = 0; i <= facets; i++) {
    const x = x0 + ((x1 - x0) * i) / facets
    points.push([x, line(x)])
  }
  points.push([x1 + 10, line(x1)])
  const span = (x1 - x0) / waves
  const xs = Array.from({ length: waves }, (_, k) => x0 + span * (k + 0.5))
  return [
    hole(region.polygon),
    paper(points, w, { join: 'miter' }),
    ...forks(xs, line, region, w, Math.min(span / 4, 12))
  ]
}

// Distortion: сосульки. Drive — число и длина; Tone — яркий звук
// добавляет колючки на сосульках; Mix — ажурность
function distortion(cut) {
  const { region } = cut
  const { x0, x1 } = region
  const w = lace(cut)
  const drive = norm(cut, 'drive')
  const bright = norm(cut, 'tone') > 0.5
  const teeth = 2 + Math.round(drive * 6)
  const depth = (0.3 + 0.7 * drive) * (EDGE_DEPTH - 22)
  const width = (x1 - x0) / teeth
  const tipY = L - 3 - w / 2
  const valleyY = tipY - depth

  const points = [[x0 - 10, valleyY]]
  for (let i = 0; i < teeth; i++) {
    points.push([x0 + width * i, valleyY], [x0 + width * (i + 0.5), tipY])
  }
  points.push([x1, valleyY], [x1 + 10, valleyY])
  const shapes = [hole(region.polygon), paper(points, w, { join: 'miter' })]

  // колючки — короткие иголки из середины каждой сосульки
  if (bright) {
    for (let i = 0; i < teeth; i++) {
      const base = [x0 + width * (i + 0.5), valleyY]
      shapes.push(paper(twig(base, 0, depth * 0.6), w * 0.75))
    }
  }
  const xs = Array.from({ length: teeth + 1 }, (_, i) => x0 + width * i)
  shapes.push(...forks(xs, () => valleyY, region, w, Math.min(width / 4, 8)))
  return shapes
}

// Phaser: ледяные уголки вдоль кромки, во внутреннем — ещё один.
// Freq — число (1–5), Oct — разброс размеров
function phaser(cut) {
  const { s0, s1, depth } = cut.region
  const w = lace(cut)
  const count = 1 + Math.round(norm(cut, 'freq') * 4)
  const spread = norm(cut, 'oct')
  const maxR = depth - w / 2 - 2
  const sizes = Array.from(
    { length: count },
    (_, i) => maxR * (1 - spread * 0.55 * noise(cut.seed, i))
  )
  const gap = 6
  const total = sizes.reduce((sum, r) => sum + 2 * r + gap, gap)
  const start = Math.max(s0, (s0 + s1 - total) / 2)
  const shapes = [foldHole(start, Math.min(s1, start + total), depth)]

  let s = start + gap
  sizes.forEach((r) => {
    if (s + 2 * r > s1) return
    const c = s + r
    for (const k of [1, 0.5]) {
      shapes.push(
        paper(
          [
            foldPoint(c - r * k, depth + 8),
            foldPoint(c, depth - r * k),
            foldPoint(c + r * k, depth + 8)
          ],
          w * (k === 1 ? 1 : 0.75),
          { join: 'miter' }
        )
      )
    }
    s += 2 * r + gap
  })
  return shapes
}

// Vibrato: иголки инея — ломаные с колючкой на конце. Depth — длина,
// Rate — число изломов, Mix — ажурность
function vibrato(cut) {
  const { s0, s1, depth } = cut.region
  const w = lace(cut)
  const length = (0.35 + 0.65 * norm(cut, 'depth')) * (depth - 2)
  const rate = norm(cut, 'rate')
  const kinks = 1 + Math.round(rate * 4)
  const amp = 1 + rate * 2.5
  const count = Math.max(2, Math.floor((s1 - s0) / 14))
  const step = (s1 - s0) / count
  const shapes = [foldHole(s0, s1, depth)]

  for (let i = 0; i < count; i++) {
    const s = s0 + step * (i + 0.5)
    const points = [foldPoint(s, depth + 8)]
    for (let k = 1; k <= kinks; k++) {
      const t = k / (kinks + 1)
      points.push(foldPoint(s + (k % 2 ? amp : -amp), depth - length * t))
    }
    const tip = foldPoint(s, depth - length)
    points.push(tip)
    shapes.push(paper(points, w, { join: 'miter' }))
    // колючка на конце — короткая «галочка» назад к основанию
    const barb = Math.min(5, step / 2 - 1)
    shapes.push(
      paper(
        [
          foldPoint(s - barb, depth - length + barb),
          tip,
          foldPoint(s + barb, depth - length + barb)
        ],
        w * 0.7,
        { join: 'miter' }
      )
    )
  }
  return shapes
}

export const frost = {
  reverb,
  delay,
  pitchShift,
  chorus,
  distortion,
  phaser,
  vibrato
}
