// Общие помощники мотивов ажура (задачи 6.2–6.3): параметры, сид,
// фигуры в координатах клина и границы областей зон.
//
// Фигуры:
//   { shape: 'path', d }                          — вырез (пустота);
//   { shape: 'path', d, stroke, paper }           — бумажная линия;
//   { shape: 'path', d, paper }                   — бумажная заливка;
//   { shape: 'circle', cx, cy, r, stroke, paper } — бумажное кольцо.
// join: 'miter' — острые углы линии (по умолчанию скруглённые).

import { EFFECTS } from '../effects.js'
import { toNormal } from '../scale.js'
import { centerLimit, foldPoint } from '../snowflake.js'

// Параметр ноды → 0…1 по его диапазону (частоты — по логарифму)
export function norm(cut, param) {
  const spec = EFFECTS[cut.type].params[param]
  return toNormal(cut.settings[param], spec)
}

// Детерминированное «случайное» число из сида выреза и номера
export function noise(seed, i) {
  const x = Math.sin(seed * 9301 + i * 49.297) * 233280
  return x - Math.floor(x)
}

export const f = (n) => Math.round(n * 100) / 100

export function polyline(points, closed = false) {
  const d = points.map(([x, y], i) => `${i ? 'L' : 'M'} ${f(x)} ${f(y)}`)
  return d.join(' ') + (closed ? ' Z' : '')
}

// Толщина бумажного узора: чем больше Mix, тем ажурнее (тоньше)
export function lace(cut) {
  return 7 - 3.5 * norm(cut, 'mix')
}

// Вырез всей области — дальше в него «возвращается» бумажный узор
export function hole(polygon) {
  return { shape: 'path', d: polyline(polygon, true) }
}

// Бумажная линия по точкам
export function paper(points, stroke, extra = {}) {
  return paperPath(polyline(points), stroke, extra)
}

// Бумажная линия по готовому пути (кривые и т. п.)
export function paperPath(d, stroke, extra = {}) {
  return { shape: 'path', d, stroke: f(stroke), paper: true, ...extra }
}

// Бумажная заливка (листок, полумесяц)
export function paperFill(points) {
  return { shape: 'path', d: polyline(points, true), paper: true }
}

export function ring(x, y, r, stroke) {
  return {
    shape: 'circle',
    cx: f(x),
    cy: f(y),
    r: f(r),
    stroke: f(stroke),
    paper: true
  }
}

// ---------- Середина: полоса между хребтом и зоной сгиба ----------

// Середина полосы на высоте y и её полуширина
export function across(region, y) {
  const right = region.x0
  const left = centerLimit(y)
  return { x: (right + left) / 2, half: (left - right) / 2 }
}

// Стебель через всю полосу: от перемычки до перемычки по её середине
export function stem(region) {
  const top = region.y1 + 10
  const bottom = region.y0 - 10
  return [
    [across(region, top).x, top],
    [across(region, bottom).x, bottom]
  ]
}

// Time L / R → крутизна плеча (Delay)
export const TIME_RISE = { '8n': 0.3, '4n': 0.6, '2n': 0.9 }

// ---------- Край ----------

// Столбики от линии края вниз, до перемычки над серединой
export function posts(xs, line, region, w) {
  return xs.map((x) =>
    paper(
      [
        [x, line(x)],
        [x, region.y0 - 10]
      ],
      w
    )
  )
}

export const WAVES = {
  sine: (t) => (1 - Math.cos(2 * Math.PI * t)) / 2,
  triangle: (t) => 1 - Math.abs(2 * (t - Math.floor(t)) - 1),
  // «ступенька» со скошенными боками — без вертикальных стенок
  square: (t) => {
    const p = t - Math.floor(t)
    return Math.min(1, Math.max(0, Math.min(p, 1 - p) * 6 - 0.6))
  }
}

// ---------- Сгиб: боковая кромка луча ----------

// Часть полосы сгиба от s0 до s1 (вырез целиком до кромки клина)
export function foldHole(s0, s1, depth) {
  return hole([
    foldPoint(s0, -20),
    foldPoint(s1, -20),
    foldPoint(s1, depth),
    foldPoint(s0, depth)
  ])
}
