// Звуковой движок: голоса по MIDI, инструменты, каналы, транспорт.
// Читает состояние ядра, но ничего в нём не меняет.

import * as Tone from 'tone'

import { loopLengthTicks, midiToEvents, parseMidi } from '../core/midi.js'
import { VOICE_IDS } from '../core/voices.js'
import { createInstrument } from './instruments.js'

import leadMidiUrl from '../data/midi/lead.mid'
import bassMidiUrl from '../data/midi/bass.mid'
import extraMidiUrl from '../data/midi/extra.mid'

const MIDI_URLS = { lead: leadMidiUrl, bass: bassMidiUrl, extra: extraMidiUrl }

// Громкость голоса 0–100 → децибелы канала (0 = тишина)
export function volumeToDb(volume) {
  return volume <= 0 ? -Infinity : Tone.gainToDb(volume / 100)
}

async function loadMidi(url) {
  const response = await fetch(url)
  return parseMidi(await response.arrayBuffer())
}

export function createEngine() {
  const voices = {}
  let master = null
  let meter = null
  let loaded = false

  // Загрузка MIDI и сэмплов, сборка графа. Звук ещё не идёт
  async function load(state) {
    if (loaded) return

    // Общий выход: лимитер не даёт сумме голосов перегружаться
    master = new Tone.Limiter(-1).toDestination()
    meter = new Tone.Meter({ normalRange: true, smoothing: 0.8 })
    master.connect(meter)

    const midis = await Promise.all(
      VOICE_IDS.map((id) => loadMidi(MIDI_URLS[id]))
    )
    const transport = Tone.getTransport()
    transport.bpm.value = midis[0].bpm
    transport.timeSignature = midis[0].timeSignature[0]

    VOICE_IDS.forEach((id, i) => {
      const midi = midis[i]
      const settings = state.voices[id]

      const instrument = createInstrument(settings.instrument)
      const channel = new Tone.Channel({
        volume: volumeToDb(settings.volume),
        pan: settings.pan
      }).connect(master)

      instrument.connect(channel)

      const part = new Tone.Part(
        (time, event) => {
          instrument.triggerAttackRelease(
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

      voices[id] = { instrument, channel, part, noteCount: midi.notes.length }
    })

    await Tone.loaded()
    loaded = true
  }

  // Запуск по жесту пользователя (требование браузера)
  async function start(state) {
    await Tone.start()
    await load(state)
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

  return { load, start, stop, isPlaying, position, level, voices }
}
