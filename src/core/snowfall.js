// Снегопад в панели слева: каждая сыгранная нота выпускает
// пиксельную снежинку. Снежинки плавно падают, пульсируя в такт,
// и уходят за нижний край. Чистые функции без DOM.
//
// Эффекты голоса сразу меняют все его снежинки — и уже летящие тоже.
// Каждый эффект — свой заметный знак, каждый контрол — своя черта:
//   Pitch Shift — размер: −12 крупнее, +7 и +12 мельче;
//   Reverb      — ореол-сияние вокруг снежинки (Decay — шире, Mix — плотнее)
//                 и медленное падение;
//   Distortion  — шипы на лучах и колючий шум (Drive — длиннее и больше),
//                 дрожь; Tone — шум мерцает чаще;
//   Chorus      — двойник рядом (Depth — дальше), который «дышит»
//                 (Rate — чаще, Wave — плавно, рывками или прыжками);
//   Vibrato     — раскачивание (Depth — размах, Rate — частота);
//   Phaser      — вращение (Freq — быстрее, Oct — туда-обратно шире);
//   Delay       — цепочка эхо-копий над снежинкой (Feedback — сколько,
//                 Time L / R — на каком расстоянии, Ping-Pong — вразлёт).

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

// ---------- Вариации формы ----------

// Снежинка с вариациями эффектов, клетки вокруг центра:
//   halo       — ореол Reverb: пунктирное кольцо на halo клеток дальше
//                лучей (0 — нет); haloDotted — реже пунктир;
//   spikes     — шипы Distortion: лучи длиннее на spikes клеток;
//   noise      — колючие искры Distortion вокруг (× 8 по симметрии);
//   noiseSeed  — какой это вариант шума (шум мерцает в такт);
//   echo       — эхо-копия Delay: каждый второй пиксель, как призрак
export function variantCells(index, v = {}) {
  const { halo = 0, haloDotted = false, spikes = 0, noise = 0 } = v
  const r = SHAPES[index].r
  const cells = shapeCells(index)
  const seen = new Set(cells.map(([x, y]) => `${x},${y}`))
  const add = (x, y) => {
    const key = `${x},${y}`
    if (!seen.has(key)) {
      seen.add(key)
      cells.push([x, y])
    }
  }
  const all8 = (x, y) => {
    for (const [a, b] of [
      [x, y],
      [y, x]
    ]) {
      for (const sx of [1, -1]) for (const sy of [1, -1]) add(a * sx, b * sy)
    }
  }

  // Шипы: лучи по осям и диагоналям продолжаются наружу
  for (let k = 1; k <= spikes; k++) {
    all8(r + k, 0)
    if (k < spikes) all8(r + k, r + k)
  }

  // Ореол: пунктирное кольцо-сияние вокруг; плотнее — каждая вторая
  // клетка кольца, реже — каждая третья
  if (halo > 0) {
    const R = r + halo + 1
    const step = haloDotted ? 3 : 2
    circle(R).forEach(([x, y], k) => {
      if (k % step === 0) all8(x, y)
    })
  }

  // Шум: пиксели в кольце вокруг снежинки, по сиду — свои для каждого
  // варианта, поэтому шум «мерцает», когда вариант меняется
  if (noise > 0) {
    let t = ((index + 1) * 2654435761 + (v.noiseSeed ?? 0) * 40503) >>> 0
    const next = () => {
      t = (Math.imul(t ^ (t >>> 13), 1274126177) + 0x9e3779b9) >>> 0
      return t / 4294967296
    }
    // каждая искра повторяется в восьми местах симметрии — их немного
    for (let k = 0; k < noise; k++) {
      const d = r + 1 + Math.round(next())
      all8(d, Math.round(next() * d))
    }
  }

  return v.echo ? cells.filter(([x, y]) => (x + y) % 2 === 0) : cells
}

// Радиус снежинки с вариациями — сколько места она занимает
export function variantRadius(index, v = {}) {
  const r = SHAPES[index].r
  return Math.max(
    r + (v.spikes ?? 0),
    v.halo ? r + v.halo + 1 : r,
    v.noise ? r + 2 : r
  )
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

// «Дыхание» двойника Chorus по форме волны Wave: 0…1 за фазу 0…1
export function breath(wave, phase) {
  const p = phase - Math.floor(phase)
  if (wave === 'triangle') return 1 - Math.abs(2 * p - 1)
  if (wave === 'square') return p < 0.5 ? 1 : 0.25
  return (1 - Math.cos(2 * Math.PI * p)) / 2
}

// ---------- Эффекты голоса ----------
// Эффекты меняют снежинки голоса сразу, и уже летящие тоже.

function norm(node, param) {
  return toNormal(node.settings[param], EFFECTS[node.type].params[param])
}

const BEATS = { '8n': 0.5, '4n': 1, '2n': 2 }

// Как выглядят и летят снежинки голоса при текущих эффектах
export function voiceLook(state, voice) {
  const look = {
    sizeShift: 0, // Pitch Shift: ступень размера
    halo: 0, // Reverb: ширина ореола, клеток
    haloDotted: false,
    lightness: 1, // множитель скорости: < 1 — медленнее
    spikes: 0, // Distortion: длина шипов
    noise: 0, // Distortion: пикселей шума
    flicker: 0, // Distortion: смен шума за долю
    tremor: 0, // Distortion: дрожь, клеток
    double: 0, // Chorus: расстояние до двойника, клеток
    doubleRate: 0, // Chorus: «вдохов» за долю
    doubleWave: 'sine',
    wobble: 0, // Vibrato: размах качания, клеток
    wobbleRate: 0.25, // Vibrato: качаний за долю
    spin: 0, // Phaser: оборотов за долю
    swing: 0, // Phaser: размах вращения туда-обратно (0 — по кругу)
    echoes: 0, // Delay: эхо-копий
    echoBeats: [1, 1], // Delay: промежутки L / R, в долях
    pingPong: false
  }

  nodesOfVoice(state, voice).forEach((id) => {
    const node = state.nodes[id]
    const mix = node.settings.mix
    if (!(mix > 0)) return
    const strong = Math.min(1, mix * 1.6)

    switch (node.type) {
      case 'pitchShift':
        if (mix >= 0.15) look.sizeShift = node.settings.interval < 0 ? 1 : -1
        break
      case 'reverb':
        look.halo = Math.max(look.halo, 1 + Math.round(node.settings.decay))
        look.haloDotted = mix < 0.5
        look.lightness *= 1 - 0.5 * strong * (0.3 + 0.7 * node.settings.decay)
        break
      case 'distortion': {
        const drive = norm(node, 'drive')
        look.spikes = Math.max(look.spikes, 1 + Math.round(drive * 2 * strong))
        look.noise = Math.max(look.noise, Math.round((1 + drive * 2) * strong))
        look.flicker = Math.max(
          look.flicker,
          1 + Math.round(norm(node, 'tone') * 3)
        )
        look.tremor = Math.max(look.tremor, strong * (0.3 + drive))
        look.lightness *= 1 + 0.4 * strong * drive
        break
      }
      case 'chorus':
        look.double = Math.max(
          look.double,
          strong * (2 + 5 * norm(node, 'depth'))
        )
        look.doubleRate = Math.max(
          look.doubleRate,
          0.25 + norm(node, 'rate') * 1.5
        )
        look.doubleWave = node.settings.wave
        break
      case 'vibrato':
        look.wobble = Math.max(
          look.wobble,
          strong * (1.5 + 6 * norm(node, 'depth'))
        )
        look.wobbleRate = Math.max(
          look.wobbleRate,
          0.2 + norm(node, 'rate') * 1.6
        )
        break
      case 'phaser':
        look.spin = Math.max(
          look.spin,
          strong * (0.06 + 0.4 * norm(node, 'freq'))
        )
        look.swing = Math.max(look.swing, norm(node, 'oct'))
        break
      case 'delay':
        look.echoes = Math.max(
          look.echoes,
          1 + Math.round(node.settings.feedback * strong)
        )
        look.echoBeats = [
          BEATS[node.settings.timeL] ?? 1,
          BEATS[node.settings.timeR] ?? 1
        ]
        look.pingPong = node.settings.pingPong
        break
    }
  })

  look.echoes = Math.min(look.echoes, 2)
  return look
}
