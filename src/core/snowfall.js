// Снегопад в панели слева (прототип): каждая сыгранная нота выпускает
// снежинку из круглых «пикселей» в цвете своего голоса. Чистые функции
// без DOM: форма снежинки и то, как эффекты голоса меняют её полёт.
//
// Правило консистентности: эффекты не меняют ни форму, ни цвет
// снежинки — только движение и свет:
//   Vibrato, Chorus — покачивание при падении;
//   Phaser          — вращение;
//   Reverb          — светящийся шлейф;
//   Delay           — эхо-снежинки вслед (Ping-Pong — вразлёт);
//   Distortion      — мерцание;
//   Pitch Shift     — размер (вниз — крупнее, вверх — мельче).

import { EFFECTS } from './effects.js'
import { toNormal } from './scale.js'
import { nodesOfVoice } from './state.js'

// ---------- Форма ----------
// Пиксели лежат на треугольной решётке: точка i·a + j·b, где
// a = (1, 0), b = (1/2, √3/2). Решётка переходит в себя при поворотах
// на 60° и отражениях, поэтому снежинка строится в секторе 0…60° и
// размножается 12 симметриями — получается правильная шестилучевая.

const H = Math.sqrt(3) / 2

function toXY(i, j) {
  return [i + j / 2, j * H]
}

function toIJ(x, y) {
  const j = Math.round(y / H)
  return [Math.round(x - j / 2), j]
}

// Расстояние в шагах решётки (шестиугольное)
export function ring(i, j) {
  return (Math.abs(i) + Math.abs(j) + Math.abs(i + j)) / 2
}

// Генератор псевдослучайных чисел из сида (mulberry32)
export function random(seed) {
  let t = Math.floor(seed * 4294967296) >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

// Точки одного сектора (0…60°). «Конституция» снежинки — из сида:
//   star   — тонкий луч с вилкой на кончике;
//   fern   — луч с короткими веточками через одну;
//   ring   — колечко в серединке и лучи;
//   dotted — пунктирный луч с крупной вилкой
const KINDS = ['star', 'fern', 'ring', 'dotted']

// Веточка (t, u) отходит от луча под 60°. Чтобы веточки соседних лучей
// не смыкались в сплошной шестиугольник, держим её ближе к своему лучу:
// u ≤ t / 2 (угол от луча не больше ≈ 20°)
function branchFits(t, u, size) {
  return u <= t / 2 && t + u <= size
}

function sector(rand, size) {
  const kind = KINDS[Math.floor(rand() * KINDS.length)]
  // У «колечка» центр пустой: шесть первых пикселей лучей — кольцо
  const points = kind === 'ring' ? [] : [[0, 0]]
  const add = (i, j) => points.push([i, j])

  // Луч
  for (let t = 1; t <= size; t++) {
    if (kind !== 'dotted' || t % 2 === size % 2 || t === 1) add(t, 0)
  }

  // Веточки под 60° от луча
  if (kind === 'fern') {
    for (let t = 2 + Math.floor(rand() * 2); t < size; t += 2) {
      for (let u = 1; branchFits(t, u, size) && u <= 2; u++) add(t, u)
    }
  }

  // Вилка на кончике луча
  if (kind !== 'fern' && branchFits(size - 1, 1, size)) {
    add(size - 1, 1)
    if (kind === 'dotted' && branchFits(size - 1, 2, size + 1)) add(size - 1, 2)
  }

  return points
}

// Снежинка: список пикселей { x, y, ring } в шагах решётки, центр в 0.
// size — длина луча в пикселях (2–6), seed — 0…1
export function flakeShape(seed, size) {
  const rand = random(seed)
  const seen = new Map()

  sector(rand, size).forEach(([i, j]) => {
    const [x, y] = toXY(i, j)
    for (let k = 0; k < 6; k++) {
      const a = (Math.PI / 3) * k
      const cos = Math.cos(a)
      const sin = Math.sin(a)
      for (const sy of [1, -1]) {
        const px = x * cos - y * sy * sin
        const py = x * sin + y * sy * cos
        const [pi, pj] = toIJ(px, py)
        const key = `${pi},${pj}`
        if (!seen.has(key)) {
          const [qx, qy] = toXY(pi, pj)
          seen.set(key, { x: qx, y: qy, ring: ring(pi, pj) })
        }
      }
    }
  })

  return [...seen.values()]
}

// ---------- Нота → снежинка ----------

// Длина луча: бас — крупные снежинки, верхний голос — мелкие;
// внутри голоса выше нота — чуть мельче
const SIZES = { bass: [6, 5], lead: [5, 4], extra: [4, 3] }
const RANGES = { bass: [29, 48], lead: [50, 65], extra: [62, 77] }

export function flakeSize(voice, midi) {
  const [big, small] = SIZES[voice]
  const [low, high] = RANGES[voice]
  const t = Math.min(1, Math.max(0, (midi - low) / (high - low)))
  return t < 0.5 ? big : small
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

// ---------- Эффекты голоса → полёт ----------

function norm(node, param) {
  return toNormal(node.settings[param], EFFECTS[node.type].params[param])
}

const BEATS = { '8n': 0.5, '4n': 1, '2n': 2 }

// Как летят снежинки голоса при текущих эффектах. Значения
// складываются от всех подключённых нод, каждая — с весом своего Mix
export function voiceLook(state, voice) {
  const look = {
    sway: 0, // покачивание, доля размера снежинки
    swayRate: 0.35, // качаний в секунду
    spin: 0, // оборотов в секунду
    trail: 0, // длина шлейфа, 0…1
    echoes: 0, // число эхо-снежинок
    echoBeats: 1, // промежуток между эхо, в долях такта
    pingPong: false,
    twinkle: 0, // сила мерцания, 0…1
    scale: 1
  }

  nodesOfVoice(state, voice).forEach((id) => {
    const node = state.nodes[id]
    const mix = node.settings.mix
    if (!(mix > 0)) return

    switch (node.type) {
      case 'vibrato':
        look.sway += mix * (0.3 + norm(node, 'depth'))
        look.swayRate = Math.max(look.swayRate, 0.2 + norm(node, 'rate') * 1.2)
        break
      case 'chorus':
        look.sway += mix * (0.2 + 0.6 * norm(node, 'depth'))
        look.swayRate = Math.max(look.swayRate, 0.2 + norm(node, 'rate') * 0.8)
        break
      case 'phaser':
        look.spin += mix * (0.05 + 0.25 * norm(node, 'freq'))
        break
      case 'reverb':
        look.trail = Math.max(
          look.trail,
          mix * (0.3 + 0.7 * node.settings.decay)
        )
        break
      case 'delay':
        look.echoes = Math.max(
          look.echoes,
          Math.round(1 + node.settings.feedback * 1.5 * Math.min(1, mix * 2))
        )
        look.echoBeats = BEATS[node.settings.timeL] ?? 1
        look.pingPong = node.settings.pingPong
        break
      case 'distortion':
        look.twinkle = Math.max(
          look.twinkle,
          mix * (0.3 + 0.7 * norm(node, 'drive'))
        )
        break
      case 'pitchShift': {
        const factor = { [-12]: 1.3, 7: 0.9, 12: 0.75 }[node.settings.interval]
        look.scale *= 1 + (factor - 1) * Math.min(1, mix * 1.5)
        break
      }
    }
  })

  look.sway = Math.min(look.sway, 1.2)
  look.spin = Math.min(look.spin, 0.4)
  look.echoes = Math.min(look.echoes, 2)
  return look
}
