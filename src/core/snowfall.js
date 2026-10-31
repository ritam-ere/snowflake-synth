// Снегопад в панели слева (прототип): каждая сыгранная нота выпускает
// пиксельную снежинку. Снежинки плавно падают, пульсируя в такт,
// и уходят за нижний край. Чистые функции без DOM.
//
// Эффекты голоса меняют только то, как снежинка падает:
//   Vibrato, Chorus — качается влево-вправо (Depth — размах, Rate — частота);
//   Phaser          — сносит вбок, как ветром;
//   Reverb          — снежинка легче, падает медленнее;
//   Delay           — следом падают эхо-снежинки (Ping-Pong — зеркально);
//   Distortion      — тяжелее и дрожит;
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

// ---------- Где появляется ----------

// Кандидаты в колонки по всей ширине: случайно (rand — генератор 0…1),
// с небольшим сдвигом по панораме голоса. Отступ — чтобы снежинка
// с качанием не заходила на закруглённые края панели
export function candidateColumns(
  cols,
  r,
  pan = 0,
  rand = Math.random,
  count = 12
) {
  const margin = r + 4
  const span = cols - margin * 2 - 1
  return Array.from({ length: count }, () => {
    const t = Math.min(1, Math.max(0, rand() + pan * 0.12))
    return margin + Math.round(t * span)
  })
}

// Выбор колонки, где новой снежинке просторнее всего. Мешают ей
// снежинки у верхнего края (любые) и те, что ниже, но медленнее, —
// новая их догонит и наслоится. Просвет больше 10 клеток уже не важен,
// поэтому среди свободных мест выбор остаётся случайным
export function pickColumn(candidates, flakes, { r, speed, topRows }) {
  let best = candidates[0]
  let bestScore = -Infinity
  candidates.forEach((col) => {
    let clearance = 10
    flakes.forEach((f) => {
      const nearTop = f.row - f.r < topRows
      const caught = f.speed < speed
      if (!nearTop && !caught) return
      const gap = Math.abs(f.col - col) - f.r - r - (f.wobble ?? 0)
      clearance = Math.min(clearance, gap)
    })
    if (clearance > bestScore) {
      bestScore = clearance
      best = col
    }
  })
  return best
}

// Куда падает эхо Delay: при Ping-Pong — зеркально на другую половину
// панели, иначе — рядом, на 6–12 клеток в сторону (rand — 0…1)
export function echoColumn(col, cols, pingPong, k, rand = 0.5) {
  if (pingPong && k % 2 === 1) return cols - 1 - col
  const shift = 6 + Math.round(rand * 6)
  const next = col + (rand < 0.5 ? -shift : shift)
  return next < 0 || next >= cols ? col - (next - col) : next
}

// ---------- Вес и ритм ----------
// Снежинки падают плавно, но скорость пульсирует в такт: на каждой доле
// (четверти) снежинка чуть ускоряется и снова замедляется. Позиция
// считается от транспорта синтезатора, поэтому быстрее музыка —
// быстрее снег, и снег не отстаёт от звука.

// Вес снежинки: крупнее — тяжелее, плюс своя случайная добавка
// (r — 0…1)
export function weightOf(index, r = 0.5) {
  return 0.6 + SHAPES[index].r * 0.12 + r * 0.5
}

// Скорость в клетках за долю: тяжёлая падает быстрее
export function cellsPerBeat(weight) {
  return weight * 9
}

// Насколько сильно скорость пульсирует на долях: 0 — ровно,
// 1 — до полной остановки между долями
export const PULSE = 0.6

// Путь за отрезок времени, в долях «ровного» падения. Скорость
// 1 + PULSE·cos(2π·доля) — максимум точно на доле; интеграл даёт
// плавное движение без рывков
export function pulseTravel(fromBeat, toBeat) {
  const wave = (b) => (PULSE * Math.sin(2 * Math.PI * b)) / (2 * Math.PI)
  return toBeat - fromBeat + wave(toBeat) - wave(fromBeat)
}

// Плавный подход параметра к цели: за время tau проходит ≈63% пути
export function ease(current, target, dt, tau = 0.25) {
  return current + (target - current) * (1 - Math.exp(-dt / tau))
}

// ---------- Эффекты голоса → падение ----------
// Эффекты меняют уже падающие снежинки сразу: подключили ноду или
// покрутили контрол — снег этого голоса плавно перестраивается.

function norm(node, param) {
  return toNormal(node.settings[param], EFFECTS[node.type].params[param])
}

const BEATS = { '8n': 0.5, '4n': 1, '2n': 2 }

// Как падают снежинки голоса при текущих эффектах. Вклад каждой
// подключённой ноды — с весом её Mix
export function voiceLook(state, voice) {
  const look = {
    wobble: 0, // размах качания, клеток
    wobbleRate: 0.25, // качаний за долю
    drift: 0, // снос вбок, клеток за долю
    lightness: 1, // множитель скорости: < 1 — медленнее
    echoes: 0, // число эхо-снежинок
    echoBeats: 1, // промежуток между эхо, в долях
    pingPong: false,
    tremor: 0, // дрожь, клеток
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
          mix * (1.5 + 5 * norm(node, 'depth'))
        )
        look.wobbleRate = Math.max(
          look.wobbleRate,
          0.15 + 1.1 * norm(node, 'rate')
        )
        break
      case 'phaser':
        look.drift = Math.max(
          look.drift,
          mix * (0.6 + 2.4 * norm(node, 'freq'))
        )
        break
      case 'reverb':
        look.lightness *= 1 - 0.55 * mix * (0.3 + 0.7 * node.settings.decay)
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
        look.lightness *= 1 + 0.6 * drive
        look.tremor = Math.max(look.tremor, drive * 1.2)
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
