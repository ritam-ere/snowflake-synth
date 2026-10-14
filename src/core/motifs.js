// Мотивы вырезов (раздел 9 ТЗ, задача 6.2): каждый эффект режет свою
// фигуру, и каждый параметр меняет её по таблице «параметр → узор».
// Чистые функции: вырез + его область → список фигур в координатах
// клина (x — от хребта влево, y — от вершины вверх).
//
// Фигуры:
//   { shape: 'circle', cx, cy, r, paper? }
//   { shape: 'path', d, stroke?, closed? }
// paper: true — вернуть бумагу (белое в маске): так делается полумесяц.
// stroke — толщина линии: так вырезаются прорези и скругляются углы.
// Мотив всегда обрезается по своей области, поэтому зоны не нарушаются.

import { EFFECTS } from './effects.js'
import { clamp, toNormal } from './scale.js'
import {
  COS,
  EDGE_DEPTH,
  FOLD_DEPTH,
  L,
  SIN,
  centerLimit,
  foldPoint
} from './snowflake.js'

// Параметр ноды → 0…1 по его диапазону (частоты — по логарифму)
function norm(cut, param) {
  const spec = EFFECTS[cut.type].params[param]
  return toNormal(cut.settings[param], spec)
}

// Детерминированное «случайное» число из сида выреза и номера
function noise(seed, i) {
  const x = Math.sin(seed * 9301 + i * 49.297) * 233280
  return x - Math.floor(x)
}

const f = (n) => Math.round(n * 100) / 100

function polyline(points, closed = true) {
  const d = points.map(([x, y], i) => `${i ? 'L' : 'M'} ${f(x)} ${f(y)}`)
  return d.join(' ') + (closed ? ' Z' : '')
}

// Скруглённый квадрат с центром (cx, cy) и половиной стороны h
function roundSquare(cx, cy, h) {
  const r = h * 0.45
  return (
    `M ${f(cx - h + r)} ${f(cy - h)} H ${f(cx + h - r)} ` +
    `Q ${f(cx + h)} ${f(cy - h)} ${f(cx + h)} ${f(cy - h + r)} V ${f(cy + h - r)} ` +
    `Q ${f(cx + h)} ${f(cy + h)} ${f(cx + h - r)} ${f(cy + h)} H ${f(cx - h + r)} ` +
    `Q ${f(cx - h)} ${f(cy + h)} ${f(cx - h)} ${f(cy + h - r)} V ${f(cy - h + r)} ` +
    `Q ${f(cx - h)} ${f(cy - h)} ${f(cx - h + r)} ${f(cy - h)} Z`
  )
}

// Размеры полосы середины
function band(region) {
  const ym = (region.y0 + region.y1) / 2
  const width = centerLimit(ym) - region.x0
  return {
    ym,
    xm: region.x0 + width / 2,
    width,
    height: region.y1 - region.y0,
    narrow: centerLimit(region.y0) - region.x0
  }
}

// ---------- Середина: отверстия ----------

// Ширина середины на высоте y от правой границы области
function widthIn(region, y) {
  return centerLimit(y) - region.x0
}

// Reverb: Decay — число кругов 1–7; Mix — диаметр крупнейшего круга.
// Круги уменьшаются от края снежинки к её центру, как затухающий хвост:
// крупный у края клина (там он шире), следующие ниже и меньше
function reverb(cut) {
  const { region } = cut
  const count = 1 + Math.round(norm(cut, 'decay') * 6)
  const top = widthIn(region, region.y1)
  const max = Math.min((region.y1 - region.y0) / 2, top / 2) - 2
  let r = Math.max(3, max * (0.3 + 0.7 * norm(cut, 'mix')))
  let y = region.y1 - r - 2
  const shapes = []

  for (let i = 0; i < count && y - r > region.y0; i++) {
    // круг не шире клина на своём нижнем краю
    const w = widthIn(region, y - r)
    const radius = Math.min(r, w / 2 - 2)
    if (radius < 2) break
    // покачивание вбок от сида, в пределах свободного места
    const room = w / 2 - radius - 2
    const x = region.x0 + w / 2 + (noise(cut.seed, i) - 0.5) * room
    shapes.push({ shape: 'circle', cx: f(x), cy: f(y), r: f(radius) })

    const next = radius * 0.72
    y -= radius + next + 3
    r = next
  }
  return shapes
}

const TIME_STEP = { '8n': 0.35, '4n': 0.9, '2n': 1.6 }

// Delay: Feedback — число повторов фигуры; Mix — размер первой;
// Time L / R — шаг фигур у левого / правого сгиба;
// Ping-Pong — цепочка зигзагом между сгибами, иначе — прямо.
// Эхо затихает к центру снежинки: первая фигура у края, дальше меньше
function delay(cut) {
  const { region } = cut
  const { timeL, timeR, pingPong } = cut.settings
  const count = 1 + Math.round(norm(cut, 'feedback') * 5)
  const height = region.y1 - region.y0
  const top = widthIn(region, region.y1)
  let h = Math.max(
    3,
    (Math.min(top, height) / 2 - 3) * (0.35 + 0.65 * norm(cut, 'mix'))
  )
  let y = region.y1 - h - 2
  const shapes = []

  for (let i = 0; i < count && y - h > region.y0; i++) {
    const left = i % 2 === 1
    // ширина по нижнему краю фигуры: там клин уже
    const w = widthIn(region, y - h)
    h = Math.min(h, w / 2 - 2)
    if (h < 2) break
    const room = Math.max(0, w / 2 - h - 2)
    const side = pingPong ? (left ? 1 : -1) : 0
    const cx = region.x0 + w / 2 + side * room
    shapes.push({ shape: 'path', d: roundSquare(cx, y, h) })

    const next = h * 0.82
    y -= h + next + h * TIME_STEP[left ? timeL : timeR]
    h = next
  }
  return shapes
}

// Pitch Shift: Interval −12 / +7 / +12 — звёздочка в 4 / 5 / 6 лучей;
// Mix — размер звёздочки
function pitchShift(cut) {
  const b = band(cut.region)
  const rays = { [-12]: 4, 7: 5, 12: 6 }[cut.settings.interval]
  const outer = Math.max(
    4,
    (Math.min(b.height, b.width) / 2 - 3) * (0.35 + 0.65 * norm(cut, 'mix'))
  )
  const inner = outer * 0.42
  const turn = noise(cut.seed, 1) * Math.PI
  const points = Array.from({ length: rays * 2 }, (_, i) => {
    const r = i % 2 ? inner : outer
    const a = turn + (Math.PI * i) / rays
    return [b.xm + Math.cos(a) * r, b.ym + Math.sin(a) * r]
  })
  // Скруглённые лучи: контур обведён той же «пустотой» с круглыми углами
  return [{ shape: 'path', d: polyline(points), stroke: 3 }]
}

// ---------- Край: силуэт ----------

// Отрезок края, который режет мотив: Mix — доля края под мотивом
function edgeSpan(cut) {
  const { x0, x1 } = cut.region
  const share = 0.35 + 0.65 * norm(cut, 'mix')
  const width = (x1 - x0) * share
  const start = x0 + (x1 - x0 - width) / 2
  return [start, start + width]
}

const WAVES = {
  sine: (t) => (1 - Math.cos(2 * Math.PI * t)) / 2,
  triangle: (t) => 1 - Math.abs(2 * (t - Math.floor(t)) - 1),
  // «ступенька» со скошенными боками — без вертикальных стенок
  square: (t) => {
    const p = t - Math.floor(t)
    return clamp(Math.min(p, 1 - p) * 6 - 0.6, 0, 1)
  }
}

// Chorus: Depth — амплитуда волны; Mix — доля края под волной;
// Wave — округлая / треугольная / ступенчатая; Rate — число волн
function chorus(cut) {
  const [a, b] = edgeSpan(cut)
  const waves = 1 + Math.round(norm(cut, 'rate') * 4)
  const amp = (0.25 + 0.75 * norm(cut, 'depth')) * (EDGE_DEPTH - 10)
  const shape = WAVES[cut.settings.wave]
  const steps = 60
  const points = [[a, L + 20]]
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    points.push([a + (b - a) * t, L - 3 - amp * shape(t * waves)])
  }
  points.push([b, L + 20])
  return [{ shape: 'path', d: polyline(points), stroke: 2 }]
}

// Distortion: Drive — глубина и число зубцов; Mix — доля края;
// Tone — скруглённые (тёмный звук) → острые (яркий) зубцы
function distortion(cut) {
  const [a, b] = edgeSpan(cut)
  const drive = norm(cut, 'drive')
  const teeth = 2 + Math.round(drive * 6)
  const depth = (0.25 + 0.75 * drive) * (EDGE_DEPTH - 8)
  const round = (1 - norm(cut, 'tone')) * 10
  const width = (b - a) / teeth
  const points = [
    [a, L + 20],
    [a, L]
  ]
  for (let i = 0; i < teeth; i++) {
    points.push([a + width * (i + 0.5), L - depth])
    points.push([a + width * (i + 1), L])
  }
  points.push([b, L + 20])
  // Скругление: контур с толстой «пустотой» и круглыми углами
  return [{ shape: 'path', d: polyline(points), stroke: Math.max(0.5, round) }]
}

// ---------- Сгиб: выемки ----------

// Phaser: Freq — число полумесяцев; Mix — размер; Oct — разброс размеров.
// Полумесяцы — замкнутые отверстия у сгиба (не касаются кромки),
// поэтому не отрезают кусочков бумаги
function phaser(cut) {
  const { s0, s1 } = cut.region
  const count = 1 + Math.round(norm(cut, 'freq') * 4)
  const spread = norm(cut, 'oct')
  const base = (FOLD_DEPTH / 2 - 2) * (0.4 + 0.6 * norm(cut, 'mix'))
  const step = (s1 - s0) / count
  const shapes = []

  for (let i = 0; i < count; i++) {
    const r = Math.max(
      2.5,
      Math.min(step / 2 - 1, base * (1 - spread * 0.7 * noise(cut.seed, i)))
    )
    const s = s0 + step * (i + 0.5)
    const [cx, cy] = foldPoint(s, FOLD_DEPTH / 2)
    // вырез — круг; «бумага» — круг, сдвинутый к сгибу: остаётся серп
    const [px, py] = foldPoint(s, FOLD_DEPTH / 2 - r * 0.45)
    shapes.push({ shape: 'circle', cx: f(cx), cy: f(cy), r: f(r) })
    shapes.push({
      shape: 'circle',
      cx: f(px),
      cy: f(py),
      r: f(r * 0.8),
      paper: true
    })
  }
  return shapes
}

// Vibrato: Depth — длина прорези; Mix — ширина; Rate — извилистость.
// Прорези идут от сгиба внутрь клина
function vibrato(cut) {
  const { s0, s1 } = cut.region
  const count = Math.max(2, Math.floor((s1 - s0) / 18))
  const length = (0.3 + 0.7 * norm(cut, 'depth')) * (FOLD_DEPTH - 3)
  const width = 1.5 + 4.5 * norm(cut, 'mix')
  const rate = norm(cut, 'rate')
  const turns = 0.5 + rate * 2.5
  const amp = 0.8 + rate * 2.6
  const step = (s1 - s0) / count
  const shapes = []

  for (let i = 0; i < count; i++) {
    const s = s0 + step * (i + 0.5)
    const points = []
    for (let k = 0; k <= 16; k++) {
      const t = k / 16
      const wobble = Math.sin(2 * Math.PI * turns * t) * amp
      const [x, y] = foldPoint(s, -4 + (length + 4) * t)
      // поперечное смещение вдоль сгиба
      points.push([x + wobble * SIN, y + wobble * COS])
    }
    shapes.push({ shape: 'path', d: polyline(points, false), stroke: width })
  }
  return shapes
}

const MOTIFS = {
  reverb,
  delay,
  pitchShift,
  chorus,
  distortion,
  phaser,
  vibrato
}

export function motif(cut) {
  return MOTIFS[cut.type](cut)
}
