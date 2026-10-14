// Перевод значения параметра в нормализованное 0–1 и обратно (раздел 10 ТЗ).
// Контролы внутри работают с 0–1, а наружу отдают значение в диапазоне
// параметра. Частоты (Гц) — по логарифмической шкале: так низкие
// значения не теснятся в начале хода.

export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

export function toNormal(value, { min, max, scale = 'linear' }) {
  if (max === min) return 0

  if (scale === 'log') {
    return clamp(Math.log(value / min) / Math.log(max / min))
  }

  return clamp((value - min) / (max - min))
}

export function fromNormal(normal, { min, max, scale = 'linear' }) {
  const n = clamp(normal)

  if (scale === 'log') return min * Math.pow(max / min, n)

  return min + n * (max - min)
}

// Подпись значения с единицами, например «40%», «1.5 Hz», «4.0 kHz»
export function formatValue(value, { unit }) {
  if (unit === '%') return `${Math.round(value * 100)}%`
  if (unit === 'Hz')
    return `${value < 1 ? value.toFixed(2) : value.toFixed(1)} Hz`
  if (unit === 'kHz') return `${(value / 1000).toFixed(1)} kHz`
  if (unit === 'oct') return `${value.toFixed(1)} oct`
  if (unit === 'st') return `${value > 0 ? '+' : ''}${value}`
  return String(value)
}
