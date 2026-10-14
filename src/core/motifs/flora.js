// Стиль «Флора» (задача 6.3): листья, лепестки, капли, шипы,
// полумесяцы и завитки — плавные линии, как вырезанные ножницами.
// Таблица «параметр → узор» та же, что у «Геометрии».
// Каждая бумажная линия доходит до границы своей области.

import { EDGE_DEPTH, L, centerLimit, foldPoint } from '../snowflake.js'
import {
  TIME_RISE,
  WAVES,
  across,
  f,
  foldHole,
  hole,
  lace,
  noise,
  norm,
  paper,
  paperFill,
  paperPath,
  posts,
  ring,
  stem
} from './common.js'

const pt = ([x, y]) => `${f(x)} ${f(y)}`

// Листок-лодочка от основания b к кончику t, ширина — доля длины
function leaf(b, t, width = 0.36) {
  const mx = (b[0] + t[0]) / 2
  const my = (b[1] + t[1]) / 2
  const nx = -(t[1] - b[1]) * width
  const ny = (t[0] - b[0]) * width
  return (
    `M ${pt(b)} Q ${pt([mx + nx, my + ny])} ${pt(t)} ` +
    `Q ${pt([mx - nx, my - ny])} ${pt(b)} Z`
  )
}

// Reverb: стебель с листьями. Decay — число листьев (1–7), листья
// мельчают к центру снежинки; Mix — ажурность
function reverb(cut) {
  const { region } = cut
  const w = lace(cut)
  const count = 1 + Math.round(norm(cut, 'decay') * 6)
  const height = region.y1 - region.y0
  const step = (height - 8) / (count + 0.5)
  const angle = (50 * Math.PI) / 180
  const shapes = [hole(region.polygon), paper(stem(region), w)]

  let len = step * 1.7
  for (let i = 0; i < count; i++) {
    const y = region.y1 - 6 - step * (i + 0.6)
    const { x, half } = across(region, y)
    const side = i % 2 ? -1 : 1
    const size = Math.min(len, (half - w - 2) / Math.sin(angle))
    if (size < 6) break
    const tip = [x + side * Math.sin(angle) * size, y + Math.cos(angle) * size]
    shapes.push(paperPath(leaf([x, y], tip), w))
    len *= 0.85
  }
  return shapes
}

// Delay: дуги-«брови», вложенные друг в друга. Feedback — число дуг;
// Time L / R — высота левого / правого конца; Ping-Pong — дуги
// качаются между сторонами; Mix — ажурность
function delay(cut) {
  const { region } = cut
  const { timeL, timeR, pingPong } = cut.settings
  const count = 1 + Math.round(norm(cut, 'feedback') * 5)
  const w = lace(cut)
  const decay = 0.82
  const total = (1 - decay ** count) / (1 - decay)
  let step = (region.y1 - region.y0 - 8) / total
  let y = region.y1
  const shapes = [hole(region.polygon)]

  for (let i = 0; i < count; i++) {
    y -= step
    const shift = pingPong ? (i % 2 ? 0.38 : -0.38) : 0
    const a = across(region, y)
    const low = a.x + shift * a.half * 2
    const yRight = y + step * TIME_RISE[timeR]
    const yLeft = y + step * TIME_RISE[timeL]
    const p0 = [region.x0 - 10, yRight]
    const p2 = [centerLimit(yLeft) + 10, yLeft]
    // контрольная точка, при которой дуга проходит через (low, y)
    const c = [2 * low - (p0[0] + p2[0]) / 2, 2 * y - (p0[1] + p2[1]) / 2]
    shapes.push(
      paperPath(
        `M ${pt(p0)} Q ${pt(c)} ${pt(p2)}`,
        Math.max(2.5, w * (1 - 0.08 * i))
      )
    )
    step *= decay
  }
  return shapes
}

// Pitch Shift: цветок. Interval −12 / +7 / +12 — 4 / 5 / 6 лепестков,
// от кончиков лепестков стебельки до границ области; Mix — ажурность
function pitchShift(cut) {
  const { region } = cut
  const w = lace(cut)
  const rays = { [-12]: 4, 7: 5, 12: 6 }[cut.settings.interval]
  const ym = (region.y0 + region.y1) / 2
  const { x, half } = across(region, ym)
  const R = Math.max(8, Math.min(half, (region.y1 - region.y0) / 2) * 0.8)
  const core = R * 0.28
  const turn = noise(cut.seed, 1) * Math.PI
  const at = (a, r) => [x + Math.cos(a) * r, ym + Math.sin(a) * r]
  const shapes = [hole(region.polygon), ring(x, ym, core, w)]

  for (let i = 0; i < rays; i++) {
    const a = turn + (2 * Math.PI * i) / rays
    shapes.push(paperPath(leaf(at(a, core), at(a, R), 0.42), w))
    shapes.push(paper([at(a, R), at(a, 400)], w))
  }
  return shapes
}

// Chorus: волнистая кромка, под ней капли. Depth — высота волны,
// Rate — число волн (и капель), Wave — форма; Mix — ажурность
function chorus(cut) {
  const { region } = cut
  const { x0, x1, y0 } = region
  const w = lace(cut)
  const waves = 1 + Math.round(norm(cut, 'rate') * 4)
  const amp = (0.25 + 0.75 * norm(cut, 'depth')) * (EDGE_DEPTH - 22)
  const shape = WAVES[cut.settings.wave]
  const line = (x) =>
    L - 4 - w / 2 - amp * shape(((x - x0) / (x1 - x0)) * waves)

  const points = []
  for (let i = -2; i <= 62; i++) {
    const x = x0 + ((x1 - x0) * i) / 60
    points.push([x, line(Math.min(x1, Math.max(x0, x)))])
  }
  const shapes = [hole(region.polygon), paper(points, w)]

  // капля висит из каждой впадины волны и опирается на перемычку
  const span = (x1 - x0) / waves
  for (let k = 0; k < waves; k++) {
    const x = x0 + span * (k + 0.5)
    const top = line(x)
    const bottom = y0 - 6
    const r = Math.min(span / 2 - w - 2, (top - bottom) * 0.45, 16)
    if (r < 3) {
      shapes.push(...posts([x], line, region, w))
      continue
    }
    const mid = bottom + (top - bottom) * 0.42
    shapes.push(
      paperPath(
        `M ${pt([x, top])} C ${pt([x - r * 1.3, mid])} ${pt([x - r, bottom])} ` +
          `${pt([x, bottom])} C ${pt([x + r, bottom])} ${pt([x + r * 1.3, mid])} ` +
          `${pt([x, top])} Z`,
        w
      )
    )
  }
  return shapes
}

// Distortion: шипы. Drive — число и высота шипов; Tone — тёмный звук
// даёт круглые бутоны, яркий — острые шипы; Mix — ажурность
function distortion(cut) {
  const { region } = cut
  const { x0, x1 } = region
  const w = lace(cut)
  const drive = norm(cut, 'drive')
  const soft = 1 - norm(cut, 'tone')
  const teeth = 2 + Math.round(drive * 6)
  const depth = (0.3 + 0.7 * drive) * (EDGE_DEPTH - 22)
  const width = (x1 - x0) / teeth
  const tipY = L - 3 - w / 2
  const valleyY = tipY - depth
  // контрольная точка бока: от середины (прямой) к углу (бутон)
  const lerp = (a, b) => [
    a[0] + (b[0] - a[0]) * soft,
    a[1] + (b[1] - a[1]) * soft
  ]

  let d = `M ${pt([x0 - 10, valleyY])}`
  for (let i = 0; i < teeth; i++) {
    const a = [x0 + width * i, valleyY]
    const t = [x0 + width * (i + 0.5), tipY]
    const b = [x0 + width * (i + 1), valleyY]
    const mid1 = [(a[0] + t[0]) / 2, (a[1] + t[1]) / 2]
    const mid2 = [(t[0] + b[0]) / 2, (t[1] + b[1]) / 2]
    d +=
      ` L ${pt(a)} Q ${pt(lerp(mid1, [a[0], t[1]]))} ${pt(t)}` +
      ` Q ${pt(lerp(mid2, [b[0], t[1]]))} ${pt(b)}`
  }
  d += ` L ${pt([x1 + 10, valleyY])}`
  const xs = Array.from({ length: teeth + 1 }, (_, i) => x0 + width * i)
  return [
    hole(region.polygon),
    paperPath(d, w, { join: soft < 0.5 ? 'miter' : 'round' }),
    ...posts(xs, () => valleyY, region, w)
  ]
}

// Phaser: полумесяцы вдоль кромки. Freq — число (1–5), Oct — разброс
// размеров, Mix — ажурность (тоньше серп)
function phaser(cut) {
  const { s0, s1, depth } = cut.region
  const count = 1 + Math.round(norm(cut, 'freq') * 4)
  const spread = norm(cut, 'oct')
  const thin = 0.55 + 0.3 * norm(cut, 'mix')
  const maxR = depth - 3
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
    const points = []
    for (let k = 0; k <= 24; k++) {
      const t = (Math.PI * k) / 24
      points.push(
        foldPoint(c - r * Math.cos(t), depth + 6 - (r + 6) * Math.sin(t))
      )
    }
    for (let k = 24; k >= 0; k--) {
      const t = (Math.PI * k) / 24
      // внутренняя дуга той же ширины, но ниже — серп тонеет к концам
      points.push(
        foldPoint(c - r * Math.cos(t), depth + 6 - (r + 6) * thin * Math.sin(t))
      )
    }
    shapes.push(paperFill(points))
    s += 2 * r + gap
  })
  return shapes
}

// Vibrato: бахрома с завитками на концах. Depth — длина, Rate —
// извилистость, Mix — ажурность
function vibrato(cut) {
  const { s0, s1, depth } = cut.region
  const w = lace(cut)
  const rate = norm(cut, 'rate')
  const turns = 0.5 + rate * 2
  const amp = 1 + rate * 3
  const count = Math.max(2, Math.floor((s1 - s0) / 16))
  const step = (s1 - s0) / count
  const curl = Math.max(2.5, Math.min(step / 2 - w / 2 - 1, 5))
  // завиток целиком помещается внутри клина
  const length = (0.3 + 0.7 * norm(cut, 'depth')) * (depth - 2 * curl - 3)
  const shapes = [foldHole(s0, s1, depth)]

  for (let i = 0; i < count; i++) {
    const s = s0 + step * (i + 0.5)
    const phase = noise(cut.seed, i) * Math.PI
    const points = []
    for (let k = 0; k <= 16; k++) {
      const t = k / 16
      const wobble = Math.sin(2 * Math.PI * turns * t + phase) * amp * t
      points.push(foldPoint(s + wobble, depth + 8 - (length + 8) * t))
    }
    shapes.push(paper(points, w))
    // завиток: колечко на конце пальчика
    const [ex, ey] = points.at(-1)
    const [cx, cy] = foldPoint(0, -curl)
    const [ox, oy] = foldPoint(0, 0)
    shapes.push(ring(ex + cx - ox, ey + cy - oy, curl, w * 0.7))
  }
  return shapes
}

export const flora = {
  reverb,
  delay,
  pitchShift,
  chorus,
  distortion,
  phaser,
  vibrato
}
