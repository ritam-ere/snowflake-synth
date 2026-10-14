// Фабрики семи эффектов (раздел 9 ТЗ).
//
// Каждый эффект — параллельный посыл: голос звучит целиком всегда,
// а Mix задаёт, сколько голоса уходит в эффект. Сам эффект работает
// на 100% wet. Схема одного экземпляра:
//
//   канал голоса → send (Gain = Mix) → эффект → output → мастер
//
// createEffect(type, settings) возвращает
//   { input, output, set(settings), fadeOut(), dispose() }

import * as Tone from 'tone'

import {
  delayGains,
  distortionAmount,
  reverbRoomSize,
  sendGain,
  tailSeconds
} from './mapping.js'

// Плавность изменений, чтобы не было щелчков
const RAMP = 0.05

function ramp(param, value) {
  param.rampTo(value, RAMP)
}

// ---------- Отдельные эффекты ----------
// Каждая функция получает вход (send) и выход (output), строит цепочку
// между ними и возвращает { set(settings), nodes }

function reverb(send, output, settings) {
  const fx = new Tone.JCReverb({
    roomSize: reverbRoomSize(settings.decay),
    wet: 1
  })
  // JCReverb заметно громче входа — выравниваем с остальными эффектами
  const trim = new Tone.Gain(Tone.dbToGain(-9))
  send.chain(fx, trim, output)

  return {
    nodes: [fx, trim],
    set: (s) => ramp(fx.roomSize, reverbRoomSize(s.decay))
  }
}

// Свой стерео-дилей: две линии задержки с разным временем слева и справа.
// Ping-Pong yes — эхо прыгает между ушами (левая линия слева, правая справа,
// повторы перекрёстно). Ping-Pong no — каждое эхо звучит в обоих ушах
function delay(send, output, settings) {
  const mono = new Tone.Mono()
  const lineL = new Tone.Delay({ maxDelay: 2 })
  const lineR = new Tone.Delay({ maxDelay: 2 })
  // Выход каждой линии: через него идут и звук, и обратная связь.
  // Его приглушают на время смены Time L/R, чтобы не было «чирика»
  const tapL = new Tone.Gain(1)
  const tapR = new Tone.Gain(1)
  const merge = new Tone.Merge()

  const gains = {}
  Object.keys(delayGains(0, true)).forEach((key) => {
    gains[key] = new Tone.Gain(0)
  })

  send.connect(mono)
  mono.connect(gains.inL)
  mono.connect(gains.inR)
  gains.inL.connect(lineL)
  gains.inR.connect(lineR)
  lineL.connect(tapL)
  lineR.connect(tapR)

  // Обратная связь: каждая линия в себя или в соседнюю
  tapL.connect(gains.LL)
  gains.LL.connect(lineL)
  tapR.connect(gains.RR)
  gains.RR.connect(lineR)
  tapL.connect(gains.LR)
  gains.LR.connect(lineR)
  tapR.connect(gains.RL)
  gains.RL.connect(lineL)

  // Раскладка по ушам
  tapL.connect(gains.outLL)
  tapL.connect(gains.outLR)
  tapR.connect(gains.outRL)
  tapR.connect(gains.outRR)
  gains.outLL.connect(merge, 0, 0)
  gains.outRL.connect(merge, 0, 0)
  gains.outLR.connect(merge, 0, 1)
  gains.outRR.connect(merge, 0, 1)
  merge.connect(output)

  const times = { L: null, R: null }

  // Время меняется скачком, но под приглушённым выходом линии:
  // плавный сдвиг времени задержки слышен как резкий свист, который
  // потом ещё и повторяется обратной связью
  function setTime(side, line, tap, value, instant) {
    const seconds = Tone.Time(value).toSeconds()
    if (times[side] === seconds) return
    times[side] = seconds

    if (instant) {
      line.delayTime.value = seconds
      return
    }

    const now = Tone.now()
    tap.gain.cancelScheduledValues(now)
    tap.gain.setValueAtTime(tap.gain.getValueAtTime(now), now)
    tap.gain.linearRampToValueAtTime(0, now + 0.03)
    line.delayTime.setValueAtTime(seconds, now + 0.035)
    tap.gain.setValueAtTime(0, now + 0.04)
    tap.gain.linearRampToValueAtTime(1, now + 0.12)
  }

  function set(s, instant = false) {
    const values = delayGains(s.feedback, s.pingPong)
    Object.entries(values).forEach(([key, value]) => {
      if (instant) gains[key].gain.value = value
      else ramp(gains[key].gain, value)
    })
    // Время — в долях такта, по темпу Transport
    setTime('L', lineL, tapL, s.timeL, instant)
    setTime('R', lineR, tapR, s.timeR, instant)
  }

  set(settings, true)

  return {
    nodes: [mono, lineL, lineR, tapL, tapR, merge, ...Object.values(gains)],
    set
  }
}

function chorus(send, output, settings) {
  const fx = new Tone.Chorus({
    frequency: settings.rate,
    depth: settings.depth,
    type: settings.wave,
    delayTime: 6,
    spread: 180,
    wet: 1
  }).start()
  send.chain(fx, output)

  return {
    nodes: [fx],
    set: (s) => {
      ramp(fx.frequency, s.rate)
      fx.depth = s.depth
      if (fx.type !== s.wave) fx.type = s.wave
    }
  }
}

// Мягкий перегруз и лоу-пасс фильтр «Tone» после него
function distortion(send, output, settings) {
  const fx = new Tone.Distortion({
    distortion: distortionAmount(settings.drive),
    oversample: '2x',
    wet: 1
  })
  const filter = new Tone.Filter({
    type: 'lowpass',
    frequency: settings.tone,
    rolloff: -12
  })
  // Перегруз громче исходника — выравниваем
  const trim = new Tone.Gain(Tone.dbToGain(-9))
  send.chain(fx, filter, trim, output)

  let drive = settings.drive

  return {
    nodes: [fx, filter, trim],
    set: (s) => {
      // Кривая перегруза пересчитывается целиком, поэтому меняем её
      // только когда Drive действительно изменился
      if (s.drive !== drive) {
        fx.distortion = distortionAmount(s.drive)
        drive = s.drive
      }
      ramp(filter.frequency, s.tone)
    }
  }
}

// Phaser в духе Phase 72: 4 ступени, умеренный Q
function phaser(send, output, settings) {
  const fx = new Tone.Phaser({
    frequency: settings.freq,
    octaves: settings.oct,
    stages: 4,
    Q: 5,
    baseFrequency: 400,
    wet: 1
  })
  send.chain(fx, output)

  return {
    nodes: [fx],
    set: (s) => {
      ramp(fx.frequency, s.freq)
      if (fx.octaves !== s.oct) fx.octaves = s.oct
    }
  }
}

function vibrato(send, output, settings) {
  const fx = new Tone.Vibrato({
    maxDelay: 0.012,
    frequency: settings.rate,
    depth: settings.depth,
    wet: 1
  })
  send.chain(fx, output)

  return {
    nodes: [fx],
    set: (s) => {
      ramp(fx.frequency, s.rate)
      ramp(fx.depth, s.depth)
    }
  }
}

function pitchShift(send, output, settings) {
  const fx = new Tone.PitchShift({
    pitch: settings.interval,
    windowSize: 0.08,
    wet: 1
  })
  send.chain(fx, output)

  return {
    nodes: [fx],
    set: (s) => {
      if (fx.pitch !== s.interval) fx.pitch = s.interval
    }
  }
}

const FACTORIES = {
  reverb,
  delay,
  chorus,
  distortion,
  phaser,
  vibrato,
  pitchShift
}

// ---------- Экземпляр эффекта ----------

export function createEffect(type, settings) {
  const factory = FACTORIES[type]
  if (!factory) throw new Error(`Нет эффекта «${type}»`)

  const send = new Tone.Gain(sendGain(settings.mix))
  const output = new Tone.Gain(1)
  const effect = factory(send, output, settings)

  let current = settings
  let disposed = false

  function set(next) {
    if (disposed) return
    current = next
    ramp(send.gain, sendGain(next.mix))
    effect.set(next)
  }

  // Отключение без щелчка: посыл плавно закрывается, хвост
  // (эхо, реверберация) доигрывает, затем узлы освобождаются
  function fadeOut() {
    if (disposed) return Promise.resolve()

    ramp(send.gain, 0)
    const tail = tailSeconds(type, current)

    return new Promise((resolve) => {
      setTimeout(() => {
        output.gain.rampTo(0, 0.3)
        setTimeout(() => {
          dispose()
          resolve()
        }, 400)
      }, tail * 1000)
    })
  }

  function dispose() {
    if (disposed) return
    disposed = true
    ;[send, ...effect.nodes, output].forEach((node) => node.dispose())
  }

  return { type, input: send, output, set, fadeOut, dispose }
}
