// Описание эффектов: параметры, диапазоны, значения по умолчанию (раздел 9 ТЗ).
// Это данные для ядра: здесь нет ни звука, ни интерфейса.
//
// Виды параметров:
//   range   — число в диапазоне [min, max]
//   options — выбор одного значения из списка
//   toggle  — да / нет

// Mix есть у каждой ноды: сколько эффекта подмешивается к голосу
const mix = { kind: 'range', min: 0, max: 1, default: 0.4 }

// Зоны снежинки: середина (отверстия), край (силуэт), сгибы (выемки)
export const ZONES = ['center', 'edge', 'folds']

export const EFFECTS = {
  reverb: {
    label: 'REVERB',
    zone: 'center',
    height: 112,
    params: {
      decay: { kind: 'range', min: 0, max: 1, default: 0.5 },
      mix
    }
  },

  delay: {
    label: 'DELAY',
    zone: 'center',
    height: 269,
    params: {
      feedback: { kind: 'range', min: 0, max: 0.85, default: 0.35 },
      mix,
      timeL: { kind: 'options', options: ['8n', '4n', '2n'], default: '4n' },
      timeR: { kind: 'options', options: ['8n', '4n', '2n'], default: '8n' },
      pingPong: { kind: 'toggle', default: true }
    }
  },

  chorus: {
    label: 'CHORUS',
    zone: 'edge',
    height: 206,
    params: {
      depth: { kind: 'range', min: 0, max: 1, default: 0.5 },
      mix,
      wave: {
        kind: 'options',
        options: ['sine', 'triangle', 'square'],
        default: 'sine'
      },
      rate: { kind: 'range', min: 0.1, max: 4, default: 1.5 }
    }
  },

  distortion: {
    label: 'DISTORTION',
    zone: 'edge',
    height: 168,
    params: {
      drive: { kind: 'range', min: 0, max: 1, default: 0.3 },
      mix,
      tone: { kind: 'range', min: 1000, max: 12000, default: 4000 }
    }
  },

  phaser: {
    label: 'PHASER',
    zone: 'folds',
    height: 168,
    params: {
      freq: { kind: 'range', min: 0.1, max: 4, default: 0.5 },
      mix,
      oct: { kind: 'range', min: 1, max: 5, default: 3 }
    }
  },

  vibrato: {
    label: 'VIBRATO',
    zone: 'folds',
    height: 168,
    params: {
      depth: { kind: 'range', min: 0, max: 1, default: 0.2 },
      mix,
      rate: { kind: 'range', min: 0.5, max: 8, default: 5 }
    }
  },

  pitchShift: {
    label: 'P SHIFT',
    zone: 'center',
    height: 112,
    params: {
      interval: { kind: 'options', options: [-12, 7, 12], default: 12 },
      mix
    }
  }
}

export const EFFECT_TYPES = Object.keys(EFFECTS)

// Настройки эффекта по умолчанию: { decay: 0.5, mix: 0.4, ... }
export function defaultSettings(type) {
  const settings = {}

  Object.entries(EFFECTS[type].params).forEach(([name, param]) => {
    settings[name] = param.default
  })

  return settings
}

// Приводит значение к допустимому для параметра.
// Возвращает undefined, если значение принять нельзя
export function normalizeParam(type, name, value) {
  const param = EFFECTS[type]?.params[name]

  if (!param) return undefined

  if (param.kind === 'range') {
    if (typeof value !== 'number' || Number.isNaN(value)) return undefined
    return Math.min(param.max, Math.max(param.min, value))
  }

  if (param.kind === 'options') {
    return param.options.includes(value) ? value : undefined
  }

  if (param.kind === 'toggle') {
    return typeof value === 'boolean' ? value : undefined
  }

  return undefined
}
