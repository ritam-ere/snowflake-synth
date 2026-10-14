// Звуковой движок: голоса по MIDI, инструменты, каналы, транспорт.
// Читает состояние ядра, но ничего в нём не меняет: интерфейс меняет
// состояние через редьюсер, а потом передаёт его сюда в update(state).

import * as Tone from 'tone'

import { loopLengthTicks, midiToEvents, parseMidi } from '../core/midi.js'
import { VOICE_IDS } from '../core/voices.js'
import { createEffect } from './effects.js'
import { createInstrument } from './instruments.js'

import leadMidiUrl from '../data/midi/lead.mid'
import bassMidiUrl from '../data/midi/bass.mid'
import extraMidiUrl from '../data/midi/extra.mid'

const MIDI_URLS = { lead: leadMidiUrl, bass: bassMidiUrl, extra: extraMidiUrl }

// Плавность изменений, чтобы не было щелчков
const RAMP_SECONDS = 0.05
// Сколько ждать хвоста старого инструмента перед удалением
const DISPOSE_DELAY_MS = 3000
const SILENCE_DB = -80

// Громкость голоса 0–100 → децибелы канала
export function volumeToDb(volume) {
  return volume <= 0 ? SILENCE_DB : Tone.gainToDb(volume / 100)
}

async function loadMidi(url) {
  const response = await fetch(url)
  return parseMidi(await response.arrayBuffer())
}

export function createEngine() {
  const voices = {}
  const listeners = new Set()
  // Подключённые эффекты: ключ связи → { voiceId, effect }
  const links = new Map()
  let master = null
  let meter = null
  let loading = null

  // ---------- Статусы инструментов (для индикатора загрузки) ----------

  function setStatus(id, status, error = null) {
    voices[id].status = status
    voices[id].error = error
    listeners.forEach((listener) => listener(id, status, error))
  }

  function onStatus(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  // ---------- Загрузка ----------

  async function build(state) {
    master = new Tone.Limiter(-1).toDestination()
    meter = new Tone.Meter({ normalRange: true, smoothing: 0.8 })
    master.connect(meter)

    const midis = await Promise.all(
      VOICE_IDS.map((id) => loadMidi(MIDI_URLS[id]))
    )
    const transport = Tone.getTransport()
    transport.bpm.value = midis[0].bpm
    transport.timeSignature = midis[0].timeSignature[0]

    const loads = VOICE_IDS.map((id, i) => {
      const midi = midis[i]
      const settings = state.voices[id]

      const channel = new Tone.Channel({
        volume: volumeToDb(settings.volume),
        mute: settings.volume <= 0,
        pan: settings.pan
      }).connect(master)

      const { instrument, loaded } = createInstrument(settings.instrument)
      instrument.connect(channel)

      // Колбэк берёт текущий инструмент голоса: после смены
      // инструмента новые ноты сразу играет новый
      const part = new Tone.Part(
        (time, event) => {
          voices[id].instrument.triggerAttackRelease(
            event.note,
            event.duration,
            time,
            event.velocity
          )
        },
        midiToEvents(midi, transport.PPQ)
      )
      part.loop = true
      part.loopEnd = `${loopLengthTicks(midi, transport.PPQ)}i`
      part.start(0)

      voices[id] = {
        instrument,
        instrumentId: settings.instrument,
        requestedId: settings.instrument,
        channel,
        part,
        noteCount: midi.notes.length,
        status: 'loading',
        error: null
      }

      return loaded.then(() => setStatus(id, 'ready'))
    })

    await Promise.all(loads)
  }

  function load(state) {
    if (!loading) loading = build(state)
    return loading
  }

  // ---------- Смена инструмента ----------

  // Пока грузится новый инструмент, играет прежний. Если за время загрузки
  // выбрали ещё один, устаревший результат выбрасывается
  async function switchInstrument(id, instrumentId) {
    const voice = voices[id]
    if (voice.requestedId === instrumentId) return

    voice.requestedId = instrumentId
    setStatus(id, 'loading')

    const { instrument, loaded } = createInstrument(instrumentId)

    try {
      await loaded
    } catch (error) {
      instrument?.dispose()
      if (voice.requestedId === instrumentId) {
        voice.requestedId = voice.instrumentId
        setStatus(id, 'error', error)
      }
      return
    }

    if (voice.requestedId !== instrumentId) {
      instrument.dispose()
      return
    }

    const old = voice.instrument
    instrument.connect(voice.channel)
    voice.instrument = instrument
    voice.instrumentId = instrumentId

    // Старый инструмент доигрывает хвосты нот и удаляется
    old.releaseAll?.()
    setTimeout(() => old.dispose(), DISPOSE_DELAY_MS)

    setStatus(id, 'ready')
  }

  // ---------- Эффекты ----------
  // Каждая связь «голос → нода» — свой экземпляр эффекта (раздел 9 ТЗ).
  // Ключ связи выбирает вызывающий код, например «n2:lead»

  function addEffect(key, voiceId, type, settings) {
    if (!master || links.has(key)) return

    const effect = createEffect(type, settings)
    voices[voiceId].channel.connect(effect.input)
    effect.output.connect(master)
    links.set(key, { voiceId, effect })
  }

  function setEffect(key, settings) {
    links.get(key)?.effect.set(settings)
  }

  // Посыл закрывается плавно, хвост доигрывает, затем dispose()
  function removeEffect(key) {
    const link = links.get(key)
    if (!link) return Promise.resolve()

    links.delete(key)
    return link.effect.fadeOut()
  }

  function effectKeys() {
    return [...links.keys()]
  }

  // ---------- Синхронизация с состоянием ядра ----------

  function update(state) {
    if (!loading) return

    VOICE_IDS.forEach((id) => {
      const voice = voices[id]
      if (!voice) return

      const settings = state.voices[id]

      voice.channel.mute = settings.volume <= 0
      voice.channel.volume.rampTo(volumeToDb(settings.volume), RAMP_SECONDS)
      voice.channel.pan.rampTo(settings.pan, RAMP_SECONDS)

      if (settings.instrument !== voice.requestedId) {
        switchInstrument(id, settings.instrument)
      }
    })
  }

  // ---------- Транспорт ----------

  // Запуск по жесту пользователя (требование браузера)
  async function start(state) {
    await Tone.start()
    await load(state)
    update(state)
    Tone.getTransport().start('+0.05')
  }

  function stop() {
    Tone.getTransport().stop()
  }

  function isPlaying() {
    return Tone.getTransport().state === 'started'
  }

  // Позиция в цикле: «такт:доля»
  function position() {
    const [bar, beat] = String(Tone.getTransport().position).split(':')
    return `${(Number(bar) % 4) + 1}:${Number(beat) + 1}`
  }

  // Уровень на выходе 0–1 (для индикатора)
  function level() {
    return meter ? meter.getValue() : 0
  }

  return {
    load,
    start,
    stop,
    update,
    onStatus,
    addEffect,
    setEffect,
    removeEffect,
    effectKeys,
    isPlaying,
    position,
    level,
    voices
  }
}
