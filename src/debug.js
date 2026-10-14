// Служебная страница: проверка звукового движка без интерфейса.
// Контролы меняют состояние через редьюсер ядра и передают его движку —
// так же будет работать настоящий интерфейс.

import { createEngine } from './audio/engine.js'
import { EFFECTS, EFFECT_TYPES, defaultSettings } from './core/effects.js'
import { createInitialState, reducer } from './core/state.js'
import { INSTRUMENT_LABELS, VOICE_IDS, VOICES } from './core/voices.js'

let state = createInitialState()
const engine = createEngine()

// Для автотестов и отладки из консоли браузера
window.snowflake = {
  engine,
  get state() {
    return state
  },
  change,
  bench
}

const STATUS_TEXT = {
  loading: 'загрузка…',
  ready: 'готов',
  error: 'ошибка загрузки, играет прежний'
}

function change(property, value) {
  state = reducer(state, { type: 'CHANGE', property, value })
  engine.update(state)
  renderLabels()
}

function panLabel(pan) {
  if (Math.abs(pan) < 0.005) return 'M'
  const side = pan < 0 ? 'L' : 'R'
  return `${side}${Math.round(Math.abs(pan) * 100)}`
}

function renderVoices() {
  const container = document.getElementById('voices')

  container.innerHTML = VOICE_IDS.map((id) => {
    const voice = state.voices[id]
    const options = VOICES[id].instruments
      .map(
        (instrument) =>
          `<option value="${instrument}" ${
            instrument === voice.instrument ? 'selected' : ''
          }>${INSTRUMENT_LABELS[instrument]}</option>`
      )
      .join('')

    return `
      <div class="voice voice-${id}">
        <span class="text-button">${id}</span>

        <label class="control text-small">
          Instrument
          <select data-voice="${id}" data-key="instrument">${options}</select>
        </label>

        <label class="control text-small">
          <span>Volume <span data-label="${id}-volume"></span></span>
          <input type="range" min="0" max="100" step="1"
            value="${voice.volume}" data-voice="${id}" data-key="volume" />
        </label>

        <label class="control text-small">
          <span>Pan <span data-label="${id}-pan"></span></span>
          <input type="range" min="-1" max="1" step="0.01"
            value="${voice.pan}" data-voice="${id}" data-key="pan" />
        </label>

        <span class="text-small voice-status" data-label="${id}-status"></span>
      </div>
    `
  }).join('')

  renderLabels()
}

// Обновляет только подписи: ползунки во время перетаскивания не трогаем
function renderLabels() {
  VOICE_IDS.forEach((id) => {
    const voice = state.voices[id]
    const status = engine.voices[id]?.status

    document.querySelector(`[data-label="${id}-volume"]`).textContent =
      voice.volume
    document.querySelector(`[data-label="${id}-pan"]`).textContent = panLabel(
      voice.pan
    )
    document.querySelector(`[data-label="${id}-status"]`).textContent = status
      ? STATUS_TEXT[status]
      : 'не загружен'
  })
}

// ---------- Эффекты ----------
// Временный стенд: свои настройки эффектов, без нод ядра.
// Связь с состоянием ядра появится в задаче 1.5

const VOICE_SHORT = { lead: 'L', bass: 'B', extra: 'E' }

const bench = Object.fromEntries(
  EFFECT_TYPES.map((type) => [
    type,
    { settings: defaultSettings(type), voices: new Set() }
  ])
)

function formatParam(param, value) {
  if (param.kind === 'toggle') return value ? 'yes' : 'no'
  if (param.kind === 'options') return String(value)
  if (param.max <= 1) return `${Math.round(value * 100)}%`
  if (param.max >= 1000) return `${(value / 1000).toFixed(1)} kHz`
  return value.toFixed(1)
}

function paramControl(type, name, param, value) {
  const data = `data-effect="${type}" data-param="${name}"`

  if (param.kind === 'range') {
    const step = (param.max - param.min) / 100
    return `<input type="range" min="${param.min}" max="${param.max}"
      step="${step}" value="${value}" ${data} />`
  }

  if (param.kind === 'options') {
    const options = param.options
      .map(
        (option, i) =>
          `<option value="${i}" ${option === value ? 'selected' : ''}>${option}</option>`
      )
      .join('')
    return `<select ${data}>${options}</select>`
  }

  return `<input type="checkbox" ${value ? 'checked' : ''} ${data} />`
}

function renderEffects() {
  const container = document.getElementById('effects')

  container.innerHTML = EFFECT_TYPES.map((type) => {
    const { settings } = bench[type]
    const params = Object.entries(EFFECTS[type].params)
      .map(
        ([name, param]) => `
          <label class="control text-small">
            <span>${name} <span data-value="${type}-${name}">${formatParam(
              param,
              settings[name]
            )}</span></span>
            ${paramControl(type, name, param, settings[name])}
          </label>`
      )
      .join('')

    const toggles = VOICE_IDS.map(
      (id) =>
        `<button class="link link-${id} text-small" data-link="${type}"
          data-voice="${id}">${VOICE_SHORT[id]}</button>`
    ).join('')

    return `
      <div class="effect">
        <div class="effect-head">
          <span class="text-button">${EFFECTS[type].label}</span>
          <span class="links">${toggles}</span>
        </div>
        ${params}
      </div>
    `
  }).join('')
}

function toggleLink(type, voiceId, button) {
  const { settings, voices } = bench[type]
  const key = `${type}:${voiceId}`

  if (voices.has(voiceId)) {
    voices.delete(voiceId)
    engine.removeEffect(key)
    button.classList.remove('on')
  } else {
    voices.add(voiceId)
    engine.addEffect(key, voiceId, type, settings)
    button.classList.add('on')
  }
}

function handleEffectInput(event) {
  const { effect: type, param: name } = event.target.dataset
  if (!type) return

  const param = EFFECTS[type].params[name]
  let value
  if (param.kind === 'range') value = Number(event.target.value)
  else if (param.kind === 'options')
    value = param.options[Number(event.target.value)]
  else value = event.target.checked

  const entry = bench[type]
  entry.settings = { ...entry.settings, [name]: value }
  entry.voices.forEach((id) =>
    engine.setEffect(`${type}:${id}`, entry.settings)
  )

  document.querySelector(`[data-value="${type}-${name}"]`).textContent =
    formatParam(param, value)
}

function setStatus(text) {
  document.getElementById('status').textContent = text
}

function tick() {
  document.getElementById('position').textContent = engine.position()
  const level = Math.min(1, engine.level() * 1.5)
  document.getElementById('meter').style.width = `${level * 100}%`
  requestAnimationFrame(tick)
}

function handleInput(event) {
  const { voice, key } = event.target.dataset
  if (!voice) return

  const value =
    key === 'instrument' ? event.target.value : Number(event.target.value)
  change(['voices', voice, key], value)
}

document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('play')
  const voices = document.getElementById('voices')

  const effects = document.getElementById('effects')

  renderVoices()
  renderEffects()
  voices.addEventListener('input', handleInput)
  effects.addEventListener('input', handleEffectInput)
  effects.addEventListener('click', (event) => {
    const button = event.target.closest('[data-link]')
    if (!button || !engine.effectKeys) return
    if (!engine.voices.lead) {
      setStatus('Сначала нажмите Play')
      return
    }
    toggleLink(button.dataset.link, button.dataset.voice, button)
  })
  engine.onStatus(renderLabels)

  button.addEventListener('click', async () => {
    if (engine.isPlaying()) {
      engine.stop()
      button.textContent = 'Play'
      setStatus('Остановлено')
      return
    }

    button.disabled = true
    setStatus('Загрузка сэмплов…')

    try {
      await engine.start(state)
      button.textContent = 'Stop'
      setStatus('Играет')
    } catch (error) {
      console.error(error)
      setStatus(`Ошибка: ${error.message}`)
    } finally {
      button.disabled = false
    }
  })

  tick()
})
