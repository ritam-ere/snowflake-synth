// Служебная страница: проверка звукового движка без интерфейса.
// Контролы меняют состояние через редьюсер ядра и передают его движку —
// так же будет работать настоящий интерфейс.

import { createEngine } from './audio/engine.js'
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
  change
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

  renderVoices()
  voices.addEventListener('input', handleInput)
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
