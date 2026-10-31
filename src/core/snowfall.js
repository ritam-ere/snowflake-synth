// Снегопад в панели слева (прототип): каждая сыгранная нота выпускает
// пиксельную снежинку. Снежинки падают по сетке ступеньками, как фигуры
// в тетрисе, и уходят за нижний край. Чистые функции без DOM.
//
// Эффекты голоса меняют только то, как снежинка падает:
//   Vibrato, Chorus — качается влево-вправо на клетку-другую;
//   Phaser          — сносит вбок, как ветром;
//   Reverb          — снежинка легче, падает медленнее;
//   Delay           — следом падают эхо-снежинки (Ping-Pong — вразлёт);
//   Distortion      — тяжелее и дёргается;
//   Pitch Shift     — снежинка крупнее (вниз) или мельче (вверх).

import { EFFECTS } from './effects.js'
import { toNormal } from './scale.js'
import { nodesOfVoice } from './state.js'

// ---------- Формы ----------
// Снежинка — набор клеток квадратной сетки вокруг центра (0, 0).
// Рисуется восьмая часть, остальное — отражениями по осям и
// диагоналям, поэтому любая форма симметрична, как настоящая снежинка.

// Отрезок от центра вдоль оси x: клетки from…to с шагом step
const axis = (to, from = 1, step = 1) =>
  range(from, to, step).map((t) => [t, 0])

// Отрезок вдоль диагонали
const diag = (to, from = 1, step = 1) =>
  range(from, to, step).map((t) => [t, t])

// Веточки поперёк оси в клетке at длиной len
const ticks = (at, len = 1) => range(1, len).map((k) => [at, k])

// Кольца радиуса r: квадратное, ромбом и круглое
function square(r) {
  return range(0, r).map((k) => [r, k])
}

function diamond(r) {
  return range(0, r).map((k) => [r - k, k])
}

function circle(r) {
  const cells = []
  for (let x = 0; x <= r; x++) {
    for (let y = 0; y <= x; y++) {
      if (Math.round(Math.hypot(x, y)) === r) cells.push([x, y])
    }
  }
  return cells
}

const dot = (x, y) => [[x, y]]
const center = [[0, 0]]

function range(from, to, step = 1) {
  const out = []
  for (let t = from; t <= to; t += step) out.push(t)
  return out
}

// Набор форм от маленьких к большим: радиус (клеток от центра) и
// восьмая часть рисунка
export const SHAPES = [
  // маленькие, радиус 1–2
  { r: 1, cells: [...center, ...axis(1)] },
  { r: 1, cells: [...center, ...diag(1)] },
  { r: 1, cells: [...axis(1), ...diag(1)] },
  { r: 2, cells: [...circle(2)] },
  { r: 2, cells: [...center, ...diag(2, 2), ...axis(2, 2)] },
  { r: 2, cells: [...center, ...diag(1), ...axis(2, 2)] },
  { r: 2, cells: [...square(2), ...axis(1)] },
  { r: 2, cells: [...square(2), ...center] },
  // средние, радиус 3
  { r: 3, cells: [...axis(3), ...diag(2), ...center] },
  { r: 3, cells: [...axis(3), ...ticks(2), ...center] },
  { r: 3, cells: [...circle(3), ...center] },
  { r: 3, cells: [...circle(3), ...axis(1), ...diag(1)] },
  { r: 3, cells: [...diamond(3), ...axis(1), ...center] },
  { r: 3, cells: [...square(3), ...diag(2), ...center] },
  { r: 3, cells: [...diag(3), ...dot(2, 0), ...center] },
  { r: 3, cells: [...square(1), ...axis(3, 3), ...diag(3, 3)] },
  // большие, радиус 4–5
  { r: 4, cells: [...axis(4), ...ticks(3), ...diag(2), ...center] },
  { r: 4, cells: [...axis(4), ...ticks(4), ...circle(2)] },
  { r: 4, cells: [...diag(4), ...dot(3, 1), ...axis(2), ...center] },
  { r: 4, cells: [...circle(4), ...axis(4), ...diag(2), ...center] },
  { r: 4, cells: [...diamond(4), ...square(1), ...axis(2, 2)] },
  { r: 4, cells: [...square(2), ...axis(4, 3), ...diag(4, 3), ...center] },
  { r: 5, cells: [...axis(5), ...ticks(2), ...ticks(4, 2), ...center] },
  { r: 5, cells: [...axis(5), ...diag(3), ...circle(3), ...center] },
  { r: 5, cells: [...axis(5, 3), ...diamond(2), ...diag(4, 3), ...center] },
  { r: 5, cells: [...diag(5), ...dot(4, 2), ...axis(2), ...center] }
]

// Восьмая часть → вся снежинка (8 симметрий квадрата)
export function shapeCells(index) {
  const seen = new Set()
  const cells = []
  SHAPES[index].cells.forEach(([x, y]) => {
    for (const [a, b] of [
      [x, y],
      [y, x]
    ]) {
      for (const sx of [1, -1]) {
        for (const sy of [1, -1]) {
          const key = `${a * sx},${b * sy}`
          if (!seen.has(key)) {
            seen.add(key)
            cells.push([a * sx, b * sy])
          }
        }
      }
    }
  })
  return cells
}

// Группы форм по размеру
const GROUPS = {
  small: SHAPES.map((s, i) => [s, i])
    .filter(([s]) => s.r <= 2)
    .map(([, i]) => i),
  medium: SHAPES.map((s, i) => [s, i])
    .filter(([s]) => s.r === 3)
    .map(([, i]) => i),
  large: SHAPES.map((s, i) => [s, i])
    .filter(([s]) => s.r >= 4)
    .map(([, i]) => i)
}
const ORDER = ['small', 'medium', 'large']
const VOICE_GROUP = { extra: 0, lead: 1, bass: 2 }

// Нота → форма: бас — большие снежинки, lead — средние, extra — маленькие.
// sizeShift (Pitch Shift) сдвигает группу на ступень. Одна и та же нота —
// одна и та же снежинка
export function shapeFor(voice, midi, sizeShift = 0) {
  const level = Math.min(2, Math.max(0, VOICE_GROUP[voice] + sizeShift))
  const group = GROUPS[ORDER[level]]
  return group[(midi * 7) % group.length]
}

// Где снежинка появляется по ширине, 0…1: в основном случайно (r — 0…1),
// низкие ноты чуть левее, высокие правее, панорама голоса — сдвиг вбок
export function spawnX(midi, pan = 0, r = 0.5) {
  const t = (midi - 29) / (77 - 29)
  return Math.min(
    0.9,
    Math.max(0.1, 0.1 + 0.8 * (0.25 * t + 0.75 * r) + pan * 0.12)
  )
}

// ---------- Вес ----------

// Вес снежинки: крупнее — тяжелее, плюс своя случайная добавка
// (r — 0…1). Тяжёлая падает быстрее
export function weightOf(index, r = 0.5) {
  return 0.6 + SHAPES[index].r * 0.12 + r * 0.5
}

// Сколько секунд между шагами вниз на одну клетку
export function stepSeconds(weight, lightness = 1) {
  return 0.075 / (weight * lightness)
}

// ---------- Эффекты голоса → падение ----------

function norm(node, param) {
  return toNormal(node.settings[param], EFFECTS[node.type].params[param])
}

const BEATS = { '8n': 0.5, '4n': 1, '2n': 2 }

// Как падают снежинки голоса при текущих эффектах. Вклад каждой
// подключённой ноды — с весом её Mix
export function voiceLook(state, voice) {
  const look = {
    wobble: 0, // размах качания, клеток
    wobbleSteps: 6, // шагов вниз на одно качание
    drift: 0, // снос вбок: клетка на столько шагов вниз (0 — нет)
    lightness: 1, // множитель скорости: < 1 — медленнее
    echoes: 0, // число эхо-снежинок
    echoBeats: 1, // промежуток между эхо, в долях такта
    pingPong: false,
    jitter: 0, // вероятность дёрнуться вбок на шаге
    sizeShift: 0
  }

  nodesOfVoice(state, voice).forEach((id) => {
    const node = state.nodes[id]
    const mix = node.settings.mix
    if (!(mix > 0)) return

    switch (node.type) {
      case 'vibrato':
      case 'chorus':
        look.wobble = Math.max(
          look.wobble,
          Math.round(mix * (1 + 2 * norm(node, 'depth')))
        )
        look.wobbleSteps = Math.min(
          look.wobbleSteps,
          Math.round(8 - 5 * norm(node, 'rate'))
        )
        break
      case 'phaser':
        look.drift = Math.max(2, Math.round(10 - 7 * mix * norm(node, 'freq')))
        break
      case 'reverb':
        look.lightness *= 1 - 0.45 * mix * (0.3 + 0.7 * node.settings.decay)
        break
      case 'delay':
        look.echoes = Math.max(
          look.echoes,
          Math.round(1 + node.settings.feedback * 1.5 * Math.min(1, mix * 2))
        )
        look.echoBeats = BEATS[node.settings.timeL] ?? 1
        look.pingPong = node.settings.pingPong
        break
      case 'distortion': {
        const drive = mix * (0.3 + 0.7 * norm(node, 'drive'))
        look.lightness *= 1 + 0.5 * drive
        look.jitter = Math.max(look.jitter, drive * 0.25)
        break
      }
      case 'pitchShift':
        if (mix >= 0.3) look.sizeShift = node.settings.interval < 0 ? 1 : -1
        break
    }
  })

  look.echoes = Math.min(look.echoes, 2)
  return look
}
