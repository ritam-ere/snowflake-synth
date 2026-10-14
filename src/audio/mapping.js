// Перевод параметров эффекта из состояния ядра в значения Tone.js
// (таблица раздела 9 ТЗ). Чистые функции без звука — их проверяют тесты.

// Reverb: Decay 0–1 → roomSize 0.2–0.93
export function reverbRoomSize(decay) {
  return 0.2 + decay * 0.73
}

// Distortion: Drive 0–1 → distortion 0.05–0.8
export function distortionAmount(drive) {
  return 0.05 + drive * 0.75
}

// Delay L/R: уровни связей внутри дилея.
// in*  — вход в линию, LL/RR/LR/RL — обратная связь (из линии → в линию),
// out* — выход линии в ухо (outLR: левая линия → правое ухо).
// Ping-Pong: вход только в левую линию, эхо перекрёстно прыгает L → R → L,
// левая линия звучит слева, правая справа.
// Без Ping-Pong: вход в обе линии, каждая повторяет сама себя,
// каждое эхо звучит в обоих ушах
const HALF = Math.SQRT1_2

export function delayGains(feedback, pingPong) {
  return pingPong
    ? {
        inL: 1,
        inR: 0,
        LL: 0,
        RR: 0,
        LR: feedback,
        RL: feedback,
        outLL: 1,
        outLR: 0,
        outRL: 0,
        outRR: 1
      }
    : {
        inL: 1,
        inR: 1,
        LL: feedback,
        RR: feedback,
        LR: 0,
        RL: 0,
        outLL: HALF,
        outLR: HALF,
        outRL: HALF,
        outRR: HALF
      }
}

// Mix 0–1 → уровень посыла. Голос звучит целиком всегда, поэтому эффект
// подаётся с запасом (+6 дБ на максимуме): иначе его почти не слышно
export const SEND_BOOST = 2

export function sendGain(mix) {
  return mix * SEND_BOOST
}

// Сколько звучит хвост эффекта после отключения, в секундах
export function tailSeconds(type, settings) {
  if (type === 'reverb') return 1 + settings.decay * 3
  if (type === 'delay') {
    // эхо затухает до −60 дБ: feedback^n = 0.001
    const repeats =
      Math.log(0.001) / Math.log(Math.max(settings.feedback, 0.01))
    return Math.min(12, 1.5 * Math.ceil(repeats) + 0.5)
  }
  return 0.5
}
