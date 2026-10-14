// Геометрия снежинки (раздел 6 ТЗ, задача 6.1). Чистые функции без
// DOM и без Math.random: одинаковое состояние → одинаковый узор.
//
// Клин — 1/12 снежинки: сектор 30° от вершины (центр снежинки) вверх.
// Координаты клина (в «бумажных» единицах):
//   x — от хребта влево (0 … y·tan30°), y — от вершины вверх (0 … L).
//   Правая кромка x = 0 — сгиб с «хребтом»: его не режут, поэтому
//   развёрнутая снежинка не распадается. Левая кромка — второй сгиб.
//
// Три зоны не пересекаются, между ними остаются перемычки бумаги:
//   center — отверстия (Reverb, Delay, Pitch Shift);
//   edge   — силуэт внешнего края (Chorus, Distortion);
//   folds  — выемки у левого сгиба (Phaser, Vibrato).
// Каждая нода получает постоянный слот в своей зоне при создании
// (node.slot в ядре), поэтому перестановка нод на поле узор не меняет.

import { EFFECTS } from './effects.js'
import { voicesOfNode } from './state.js'

export const L = 480 // длина клина от вершины до края
export const TAN30 = Math.tan(Math.PI / 6)
export const COS30 = Math.cos(Math.PI / 6)
export const WIDTH = L * TAN30 // ширина клина у края ≈ 277

export const SPINE = 8 // хребет вдоль правого сгиба
export const MARGIN = 8 // перемычки между зонами
export const APEX = 40 // нетронутая вершина
export const EDGE_DEPTH = 56 // глубина зоны края
export const FOLD_DEPTH = 30 // глубина зоны сгиба (поперёк сгиба)

export const SLOTS = 12 // максимум нод — по 12 слотов в каждой зоне

// ---------- Клин ----------

// Ширина клина на высоте y
export function widthAt(y) {
  return y * TAN30
}

// Расстояние от точки до левого сгиба (по перпендикуляру)
export function distanceToFold(x, y) {
  return (y * TAN30 - x) * COS30
}

export function inWedge(x, y) {
  return y >= 0 && y <= L && x >= 0 && x <= widthAt(y) + 1e-9
}

// ---------- Зоны ----------

// Зона середины: отступы от хребта, левого сгиба, вершины и края
export function inCenter(x, y, clearance = 0) {
  return (
    y >= APEX + MARGIN + clearance &&
    y <= L - EDGE_DEPTH - MARGIN - clearance &&
    x >= SPINE + MARGIN + clearance &&
    distanceToFold(x, y) >= FOLD_DEPTH + MARGIN + clearance
  )
}

// ---------- Слоты ----------

// Середина: точки треугольной решётки внутри зоны с запасом на радиус.
// Шаг решётки — самый крупный, при котором помещаются все 12 слотов.
// Порядок — «дальнейшая точка» от центра зоны: первые слоты расходятся
// по клину, а не толпятся
function lattice(spacing) {
  const radius = spacing / 2 - 3
  const rowHeight = (spacing * Math.sqrt(3)) / 2
  const points = []

  for (let row = 0; ; row++) {
    const y = APEX + MARGIN + radius + row * rowHeight
    if (y > L) break
    const shift = row % 2 ? spacing / 2 : 0
    for (let x = SPINE + MARGIN + radius + shift; x < WIDTH; x += spacing) {
      if (inCenter(x, y, radius)) points.push({ x, y, radius })
    }
  }
  return points
}

function centerSlots() {
  let spacing = 70
  let points = lattice(spacing)
  while (points.length < SLOTS) {
    spacing -= 1
    points = lattice(spacing)
  }

  const cx = points.reduce((s, p) => s + p.x, 0) / points.length
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length
  const rest = [...points].sort(
    (a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy)
  )
  const order = [rest.shift()]

  while (order.length < SLOTS) {
    let best = 0
    let bestDistance = -1
    rest.forEach((p, i) => {
      const d = Math.min(...order.map((o) => Math.hypot(p.x - o.x, p.y - o.y)))
      if (d > bestDistance) {
        bestDistance = d
        best = i
      }
    })
    order.push(rest.splice(best, 1)[0])
  }

  return order
}

// Порядок сегментов: сначала через один, чтобы соседние вырезы
// не слипались, потом промежутки
const SEGMENT_ORDER = [1, 3, 5, 0, 2, 4]

// Край: верхняя кромка от хребта до левого сгиба, 6 сегментов;
// слоты 6–11 — те же места со сдвигом на полсегмента
function edgeSlots() {
  const x0 = SPINE + MARGIN
  const x1 = WIDTH - FOLD_DEPTH / COS30 - MARGIN
  const size = (x1 - x0) / 6

  return Array.from({ length: SLOTS }, (_, k) => {
    const segment = SEGMENT_ORDER[k % 6] + (k >= 6 ? 0.5 : 0)
    const from = x0 + Math.min(segment, 5) * size
    return { from, to: from + size, depth: EDGE_DEPTH }
  })
}

// Сгиб: левая кромка от вершины до зоны края, 6 сегментов вдоль неё
// (расстояние по сгибу от вершины); слоты 6–11 — со сдвигом
function foldSlots() {
  const s0 = (APEX + MARGIN) / COS30
  const s1 = (L - EDGE_DEPTH - MARGIN) / COS30
  const size = (s1 - s0) / 6

  return Array.from({ length: SLOTS }, (_, k) => {
    const segment = SEGMENT_ORDER[k % 6] + (k >= 6 ? 0.5 : 0)
    const from = s0 + Math.min(segment, 5) * size
    return { from, to: from + size, depth: FOLD_DEPTH }
  })
}

export const SLOT_GEOMETRY = {
  center: centerSlots(),
  edge: edgeSlots(),
  folds: foldSlots()
}

// ---------- Сид ----------

// Постоянное псевдослучайное число из id ноды (FNV-1a → 0…1).
// «Хаос» узора детерминирован: та же нода — тот же рисунок
export function seedOf(id) {
  let hash = 2166136261
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967296
}

// ---------- Узор ----------

// Вырезы по состоянию: только ноды, подключённые хотя бы к одному
// голосу, и только с Mix > 0. Порядок — по id ноды, не по колонкам
export function snowflakePattern(state) {
  return Object.values(state.nodes)
    .filter((node) => voicesOfNode(state, node.id).length > 0)
    .filter((node) => node.settings.mix > 0)
    .sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)))
    .map((node) => {
      const zone = EFFECTS[node.type].zone
      return {
        nodeId: node.id,
        type: node.type,
        zone,
        slot: SLOT_GEOMETRY[zone][node.slot % SLOTS],
        settings: node.settings,
        seed: seedOf(node.id)
      }
    })
}

// ---------- Разворот ----------

// 12 копий клина вокруг центра снежинки. Клин в SVG рисуется вершиной
// в начале координат и уходит вверх-влево (сектор от −30° до 0° от
// вертикали). Чётные копии повёрнуты на 30°·k, нечётные отражены
// по хребту и повёрнуты на 30°·(k−1): соседние копии сходятся
// одинаковыми кромками — хребет к хребту, сгиб к сгибу
export function unfoldTransforms() {
  return Array.from({ length: 12 }, (_, k) =>
    k % 2 === 0 ? `rotate(${30 * k})` : `rotate(${30 * (k - 1)}) scale(-1 1)`
  )
}

// Сектор, который занимает копия k (градусы по часовой от вертикали)
export function unfoldSector(k) {
  return k % 2 === 0 ? [30 * k - 30, 30 * k] : [30 * (k - 1), 30 * k]
}
