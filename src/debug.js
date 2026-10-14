// Служебная страница: проверка звукового движка без интерфейса.
// Контролы меняют состояние через редьюсер ядра и передают его движку —
// так же будет работать настоящий интерфейс.

import { createEngine } from './audio/engine.js'
import { EFFECTS, EFFECT_TYPES } from './core/effects.js'
import {
  canAddNodes,
  createInitialState,
  isLinked,
  nodeCount,
  reducer
} from './core/state.js'
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
  dispatch
}

const STATUS_TEXT = {
  loading: 'загрузка…',
  ready: 'готов',
  error: 'ошибка загрузки, играет прежний'
}

// Любое действие: новое состояние ядра → движок пересобирает звук
function dispatch(action) {
  const prev = state
  state = reducer(state, action)
  if (state === prev) return

  engine.update(state)
  renderLabels()
  if (prev.nodes !== state.nodes && nodeCount(prev) !== nodeCount(state)) {
    renderEffects()
  }
  renderLinks()
}

function change(property, value) {
  dispatch({ type: 'CHANGE', property, value })
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

// ---------- Эффекты (ноды из состояния ядра) ----------

const VOICE_SHORT = { lead: 'L', bass: 'B', extra: 'E' }

function formatParam(param, value) {
  if (param.kind === 'toggle') return value ? 'yes' : 'no'
  if (param.kind === 'options') return String(value)
  if (param.max <= 1) return `${Math.round(value * 100)}%`
  if (param.max >= 1000) return `${(value / 1000).toFixed(1)} kHz`
  return value.toFixed(1)
}

function paramControl(nodeId, name, param, value) {
  const data = `data-node="${nodeId}" data-param="${name}"`

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

  container.innerHTML = Object.values(state.nodes)
    .map((node) => {
      const spec = EFFECTS[node.type]
      const params = Object.entries(spec.params)
        .map(
          ([name, param]) => `
          <label class="control text-small">
            <span>${name} <span data-value="${node.id}-${name}">${formatParam(
              param,
              node.settings[name]
            )}</span></span>
            ${paramControl(node.id, name, param, node.settings[name])}
          </label>`
        )
        .join('')

      const toggles = VOICE_IDS.map(
        (id) =>
          `<button class="link link-${id} text-small" data-link="${node.id}"
          data-voice="${id}">${VOICE_SHORT[id]}</button>`
      ).join('')

      return `
      <div class="effect">
        <div class="effect-head">
          <span class="text-button">${spec.label}
            <span class="node-id text-small">${node.id}</span></span>
          <span class="links">${toggles}</span>
        </div>
        ${params}
      </div>
    `
    })
    .join('')

  renderAddButtons()
  renderLinks()
}

function renderAddButtons() {
  const container = document.getElementById('add')
  const disabled = canAddNodes(state) ? '' : 'disabled'

  container.innerHTML =
    EFFECT_TYPES.map(
      (type) =>
        `<button class="add text-small" data-add="${type}" ${disabled}>+ ${EFFECTS[type].label}</button>`
    ).join('') +
    `<span class="text-small count">${nodeCount(state)} / 12</span>`
}

// Подсветка кнопок L B E по связям в состоянии
function renderLinks() {
  document.querySelectorAll('[data-link]').forEach((button) => {
    const on = isLinked(state, button.dataset.voice, button.dataset.link)
    button.classList.toggle('on', on)
  })
  const count = document.getElementById('instances')
  if (count) {
    const { instances, taps } = engine.graphInfo()
    count.textContent = `${instances.length} эффектов, ${taps.length} посылов`
  }
}

function handleEffectInput(event) {
  const { node: nodeId, param: name } = event.target.dataset
  if (!nodeId) return

  const param = EFFECTS[state.nodes[nodeId].type].params[name]
  let value
  if (param.kind === 'range') value = Number(event.target.value)
  else if (param.kind === 'options')
    value = param.options[Number(event.target.value)]
  else value = event.target.checked

  change(['nodes', nodeId, 'settings', name], value)

  document.querySelector(`[data-value="${nodeId}-${name}"]`).textContent =
    formatParam(param, state.nodes[nodeId].settings[name])
}

function handleEffectClick(event) {
  const link = event.target.closest('[data-link]')
  if (link) {
    const { link: nodeId, voice } = link.dataset
    dispatch({
      type: isLinked(state, voice, nodeId) ? 'UNLINK' : 'LINK',
      voice,
      nodeId
    })
    return
  }

  const add = event.target.closest('[data-add]')
  if (add) dispatch({ type: 'ADD_NODES', types: [add.dataset.add] })
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
  const add = document.getElementById('add')

  renderVoices()
  renderEffects()
  voices.addEventListener('input', handleInput)
  effects.addEventListener('input', handleEffectInput)
  effects.addEventListener('click', handleEffectClick)
  add.addEventListener('click', handleEffectClick)
  engine.onStatus(renderLabels)
  setInterval(renderLinks, 500)

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
