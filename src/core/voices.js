// Голоса и их инструменты (раздел 4 ТЗ). Только данные, без звука.

export const VOICE_IDS = ['lead', 'bass', 'extra']

export const VOICES = {
  lead: {
    instruments: ['whirly', 'celesta', 'music-box', 'vibraphone'],
    defaults: { instrument: 'whirly', volume: 80, pan: -0.5 }
  },
  bass: {
    instruments: ['church-organ', 'warm-pad', 'harp', 'soft-sine'],
    defaults: { instrument: 'church-organ', volume: 80, pan: 0 }
  },
  extra: {
    instruments: ['fm-keys', 'fm-piano', 'glockenspiel', 'kalimba'],
    defaults: { instrument: 'fm-keys', volume: 80, pan: 0.5 }
  }
}

// Названия инструментов для интерфейса (латиницей, как весь UI)
export const INSTRUMENT_LABELS = {
  whirly: 'Whirly',
  celesta: 'Celesta',
  'music-box': 'Music box',
  vibraphone: 'Vibraphone',
  'church-organ': 'Church organ',
  'warm-pad': 'Warm pad',
  harp: 'Harp',
  'soft-sine': 'Soft sine',
  'fm-keys': 'FM keys',
  'fm-piano': 'FM piano',
  glockenspiel: 'Glockenspiel',
  kalimba: 'Kalimba'
}

// Приводит настройку голоса к допустимому значению.
// Возвращает undefined, если значение принять нельзя
export function normalizeVoiceSetting(voice, key, value) {
  if (!VOICES[voice]) return undefined

  if (key === 'volume') {
    if (typeof value !== 'number' || Number.isNaN(value)) return undefined
    return Math.min(100, Math.max(0, value))
  }

  if (key === 'pan') {
    if (typeof value !== 'number' || Number.isNaN(value)) return undefined
    return Math.min(1, Math.max(-1, value))
  }

  if (key === 'instrument') {
    return VOICES[voice].instruments.includes(value) ? value : undefined
  }

  return undefined
}
