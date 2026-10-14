// Служебная страница: проверка звукового движка без интерфейса

import { createEngine } from './audio/engine.js'
import { createInitialState } from './core/state.js'
import { VOICE_IDS } from './core/voices.js'

const state = createInitialState()
const engine = createEngine()

// Для автотестов и отладки из консоли браузера
window.snowflake = { engine, state }

function renderVoices() {
  const container = document.getElementById('voices')

  container.innerHTML = VOICE_IDS.map((id) => {
    const voice = state.voices[id]
    const notes = engine.voices[id]?.noteCount ?? '—'

    return `
      <div class="voice voice-${id}">
        <span class="text-button">${id}</span>
        <span class="text-small">${voice.instrument}</span>
        <span class="text-small">громкость ${voice.volume} · панорама ${voice.pan}</span>
        <span class="text-small">нот в цикле: ${notes}</span>
      </div>
    `
  }).join('')
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

document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('play')
  renderVoices()

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
      renderVoices()
    } catch (error) {
      console.error(error)
      setStatus(`Ошибка: ${error.message}`)
    } finally {
      button.disabled = false
    }
  })

  tick()
})
