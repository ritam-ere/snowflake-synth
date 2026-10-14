// Перевод параметров эффекта из состояния ядра в значения Tone.js
// (таблица раздела 9 ТЗ). Чистые функции без звука — их проверяют тесты.

// Reverb: Decay 0–1 → roomSize 0–0.9
export function reverbRoomSize(decay) {
  return decay * 0.9
}

// Distortion: Drive 0–1 → distortion 0–0.5 (мягкий перегруз)
export function distortionAmount(drive) {
  return drive * 0.5
}

// Delay L/R: уровни шести связей внутри дилея.
// Ping-Pong: вход только в левую линию, эхо перекрёстно прыгает L → R → L.
// Без Ping-Pong: вход в обе линии, каждая повторяет сама себя
export function delayGains(feedback, pingPong) {
  return pingPong
    ? { inL: 1, inR: 0, LL: 0, RR: 0, LR: feedback, RL: feedback }
    : { inL: 1, inR: 1, LL: feedback, RR: feedback, LR: 0, RL: 0 }
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
