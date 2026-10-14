// Стиль «Геометрия» (задача 6.2): кольца, лесенки, спицы, зубцы,
// ушки, бахрома. Вырез почти целиком открывает свою область, а внутри
// остаётся тонкий бумажный узор. Каждый параметр меняет свой узор.
//
// Связность: каждая бумажная линия доходит до границы своей области —
// там начинается целая бумага перемычек, хребта и кромки. Мотив
// обрезается по области, поэтому зоны не нарушаются и бумага
// не распадается на отдельные кусочки.

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
  posts
} from './common.js'

// Reverb: веточка с кольцами-отражениями. Decay — число колец (1–7),
// они мельчают от края к центру, как затухающий хвост; Mix — ажурность
function reverb(cut) {
  const { region } = cut
  const w = lace(cut)
  const count = 1 + Math.round(norm(cut, 'decay') * 6)
  const height = region.y1 - region.y0
  const pad = 4
  const gap = 3
  const q = 0.8
  // крупнейшее кольцо, при котором вся цепочка помещается по высоте
  const chain = (2 * (1 - q ** count)) / (1 - q)
  const fit = (height - 2 * pad - gap * (count - 1)) / chain
  let r = Math.min(fit, across(region, region.y1).half - w / 2 - 3)
  let y = region.y1 - pad - r

  const top = across(region, region.y1 + 10)
  const bottom = across(region, region.y0 - 10)
  const shapes = [
    hole(region.polygon),
    // стебель через всю полосу: держит кольца и обе перемычки
    paper(
      [
        [top.x, region.y1 + 10],
        [bottom.x, region.y0 - 10]
      ],
      w
    )
  ]

  for (let i = 0; i < count && r > 3; i++) {
    const { x, half } = across(region, y)
    const radius = Math.min(r, half - w / 2 - 3)
    if (radius < 3 || y - radius < region.y0) break
    shapes.push({
      shape: 'circle',
      cx: f(x),
      cy: f(y),
      r: f(radius),
      stroke: f(w),
      paper: true
    })
    const next = radius * q
    y -= radius + next + gap
    r = next
  }
  return shapes
}

// Delay: лесенка уголков-повторов. Feedback — число уголков (1–6);
// Time L / R — высота левого / правого плеча; Ping-Pong — вершины
// уголков качаются между сгибами; Mix — ажурность. Повторы затихают
// к центру снежинки: шаг и толщина уменьшаются
function delay(cut) {
  const { region } = cut
  const { timeL, timeR, pingPong } = cut.settings
  const count = 1 + Math.round(norm(cut, 'feedback') * 5)
  const w = lace(cut)
  const decay = 0.82
  // шаги убывают и вместе заполняют всю полосу
  const total = (1 - decay ** count) / (1 - decay)
  let step = (region.y1 - region.y0 - 8) / total
  let y = region.y1
  const shapes = [hole(region.polygon)]

  for (let i = 0; i < count; i++) {
    y -= step
    const shift = pingPong ? (i % 2 ? 0.38 : -0.38) : 0
    const a = across(region, y)
    const tip = a.x + shift * a.half * 2
    const yRight = y + step * TIME_RISE[timeR]
    const yLeft = y + step * TIME_RISE[timeL]
    // уголок острием к центру снежинки, плечи упираются в края полосы
    shapes.push(
      paper(
        [
          [region.x0 - 10, yRight],
          [tip, y],
          [centerLimit(yLeft) + 10, yLeft]
        ],
        Math.max(2.5, w * (1 - 0.08 * i))
      )
    )
    step *= decay
  }
  return shapes
}

// Pitch Shift: колесо со звездой. Interval −12 / +7 / +12 — звезда
// в 4 / 5 / 6 лучей, от концов лучей спицы до границ области;
// Mix — ажурность
function pitchShift(cut) {
  const { region } = cut
  const w = lace(cut)
  const rays = { [-12]: 4, 7: 5, 12: 6 }[cut.settings.interval]
  const ym = (region.y0 + region.y1) / 2
  const { x, half } = across(region, ym)
  const R = Math.max(6, Math.min(half, (region.y1 - region.y0) / 2) * 0.72)
  const turn = noise(cut.seed, 1) * Math.PI
  const at = (a, r) => [x + Math.cos(a) * r, ym + Math.sin(a) * r]

  const star = Array.from({ length: rays * 2 + 1 }, (_, i) =>
    at(turn + (Math.PI * i) / rays, i % 2 ? R * 0.42 : R)
  )
  const shapes = [
    hole(region.polygon),
    {
      shape: 'circle',
      cx: f(x),
      cy: f(ym),
      r: f(R),
      stroke: f(w),
      paper: true
    },
    paper(star, w)
  ]
  // спицы от концов лучей наружу — держат колесо за края полосы
  for (let i = 0; i < rays; i++) {
    const a = turn + (2 * Math.PI * i) / rays
    shapes.push(paper([at(a, R), at(a, 400)], w))
  }
  return shapes
}

// ---------- Край: силуэт и кружево под ним ----------

// Chorus: волнистая кромка на столбиках. Depth — высота волны,
// Rate — число волн, Wave — округлая / треугольная / ступенчатая;
// Mix — ажурность. Над волной — пустота (новый силуэт), под ней — окна
function chorus(cut) {
  const { region } = cut
  const { x0, x1 } = region
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
  const xs = Array.from(
    { length: waves },
    (_, k) => x0 + ((x1 - x0) * (k + 0.5)) / waves
  )
  return [hole(region.polygon), paper(points, w), ...posts(xs, line, region, w)]
}

// Distortion: зубчатая кромка на столбиках. Drive — число и глубина
// зубцов; Tone — тёмный звук скругляет зубцы, яркий заостряет;
// Mix — ажурность
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

  const points = [[x0 - 10, tipY]]
  for (let i = 0; i < teeth; i++) {
    points.push([x0 + width * i, valleyY])
    points.push([x0 + width * (i + 0.5), tipY])
  }
  points.push([x1, valleyY], [x1 + 10, tipY])
  const xs = Array.from({ length: teeth + 1 }, (_, i) => x0 + width * i)
  return [
    hole(region.polygon),
    paper(points, w, { join: bright ? 'miter' : 'round' }),
    ...posts(xs, () => valleyY, region, w)
  ]
}

// ---------- Сгиб: выемки в боковой кромке луча ----------

// Phaser: ушки-полумесяцы вдоль кромки. Freq — число ушек (1–5),
// Oct — разброс размеров, Mix — ажурность
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
  // выемка занимает ровно ушки, остальная кромка цела
  const start = Math.max(s0, (s0 + s1 - total) / 2)
  const shapes = [foldHole(start, Math.min(s1, start + total), depth)]

  let s = start + gap
  sizes.forEach((r) => {
    if (s + 2 * r > s1) return
    const c = s + r
    const points = []
    // полукольцо от внутренней границы выемки к кромке и обратно
    for (let k = 0; k <= 24; k++) {
      const t = (Math.PI * k) / 24
      points.push(foldPoint(c - r * Math.cos(t), depth - r * Math.sin(t)))
    }
    points.unshift(foldPoint(c - r, depth + 8))
    points.push(foldPoint(c + r, depth + 8))
    shapes.push(paper(points, w))
    s += 2 * r + gap
  })
  return shapes
}

// Vibrato: бахрома из извилистых бумажных пальчиков. Depth — длина
// пальчиков, Rate — извилистость, Mix — ажурность (тоньше пальчики)
function vibrato(cut) {
  const { s0, s1, depth } = cut.region
  const w = lace(cut)
  const length = (0.35 + 0.65 * norm(cut, 'depth')) * (depth + 4)
  const rate = norm(cut, 'rate')
  const turns = 0.5 + rate * 2
  const amp = 1 + rate * 3
  const count = Math.max(2, Math.floor((s1 - s0) / 13))
  const step = (s1 - s0) / count
  const shapes = [foldHole(s0, s1, depth)]

  for (let i = 0; i < count; i++) {
    const s = s0 + step * (i + 0.5)
    const phase = noise(cut.seed, i) * Math.PI
    const points = []
    for (let k = 0; k <= 16; k++) {
      const t = k / 16
      const wobble = Math.sin(2 * Math.PI * turns * t + phase) * amp * t
      // от внутренней границы выемки наружу, к кромке
      points.push(foldPoint(s + wobble, depth + 8 - (length + 8) * t))
    }
    shapes.push(paper(points, w))
  }
  return shapes
}

export const geometry = {
  reverb,
  delay,
  pitchShift,
  chorus,
  distortion,
  phaser,
  vibrato
}
