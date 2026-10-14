// Геометрия полосок: чистые функции, их проверяют тесты.
// Полоска 156 × 25, координаты в пикселях SVG.

export const STRIP_W = 156
export const STRIP_H = 25
const MID = STRIP_H / 2

// ---------- Rate: бегущая волна ----------

// Число волн на полоске растёт со значением: чем выше Rate, тем гуще
export function wavePeriods(normal) {
  return 0.5 + 2 * normal
}

const WAVE_AMP = 11

// Путь волны. Фаза отсчитывается от точки anchor (под бегунком):
// при смене значения волна сжимается вокруг бегунка и не дёргается.
// phase — в оборотах (1 = одна волна), растёт со временем — волна бежит
export function wavePath(normal, phase, anchor, step = 2) {
  const length = STRIP_W / wavePeriods(normal)
  const points = []

  for (let x = 0; x <= STRIP_W; x += step) {
    const turns = (x - anchor) / length - phase
    const y = MID - WAVE_AMP * Math.cos(2 * Math.PI * turns)
    points.push(`${x.toFixed(1)} ${y.toFixed(2)}`)
  }

  return `M ${points.join(' L ')}`
}

// ---------- Oct: разброс кирпичиков ----------

export const BRICKS = 9
export const BRICK_W = 15
export const BRICK_H = 3
const BRICK_GAP = (STRIP_W - BRICKS * BRICK_W) / (BRICKS - 1)
const BRICK_MAX = MID - BRICK_H / 2

// Постоянное направление и доля смещения каждого кирпичика:
// «хаос» детерминирован, поэтому при движении ничего не мерцает
const SPREAD = [-0.35, 0.7, -0.1, -0.85, 0.25, 0.9, -0.55, 0.45, -0.75]

export function bricks(normal) {
  return SPREAD.map((share, i) => ({
    x: i * (BRICK_W + BRICK_GAP),
    y: MID - BRICK_H / 2 + share * BRICK_MAX * normal
  }))
}
