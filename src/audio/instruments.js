// Инструменты голосов. Каждый инструмент полифонический:
// у лида ноты перекрываются (легато), монофонический синт их бы обрывал.
//
// Сэмплы лежат статикой в папке samples/ (см. bun.config.*) и загружаются
// только когда инструмент выбран. Громкость (volume, дБ) подобрана замером:
// пики голосов около −11 дБ, бас чуть тише.

import * as Tone from 'tone'

const SAMPLES_URL = 'samples/'

// Ноты сэмплов с шагом в малую терцию вокруг диапазона голоса
const LEAD_NOTES = ['Eb3', 'Gb3', 'A3', 'C4', 'Eb4', 'Gb4'] // голос D3–F4
const BASS_NOTES = ['Gb1', 'A1', 'C2', 'Eb2', 'Gb2', 'A2', 'C3'] // F1–C3
const EXTRA_NOTES = ['Eb4', 'Gb4', 'A4', 'C5', 'Eb5', 'Gb5'] // D4–F5

const FLAT_TO_SHARP = { Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#', Db: 'C#' }

// ['Eb3', 'A3'] → { 'D#3': 'Eb3.mp3', A3: 'A3.mp3' }
function sampleUrls(notes) {
  const urls = {}

  notes.forEach((file) => {
    const name = file.slice(0, -1)
    const octave = file.slice(-1)
    urls[`${FLAT_TO_SHARP[name] ?? name}${octave}`] = `${file}.mp3`
  })

  return urls
}

function sampler(folder, notes, options) {
  return { kind: 'sampler', folder, notes, options }
}

function synth(create) {
  return { kind: 'synth', create }
}

const INSTRUMENTS = {
  // lead
  whirly: sampler('electric-piano', LEAD_NOTES, { release: 1.2, volume: 12 }),
  celesta: sampler('celesta', LEAD_NOTES, { release: 1.5, volume: 13.5 }),
  'music-box': sampler('music-box', LEAD_NOTES, { release: 1.5, volume: 14 }),
  vibraphone: sampler('vibraphone', LEAD_NOTES, { release: 1.5, volume: 16 }),

  // bass
  'church-organ': sampler('church-organ', BASS_NOTES, {
    attack: 0.02,
    release: 0.4,
    volume: 12
  }),
  'warm-pad': sampler('warm-pad', BASS_NOTES, {
    attack: 0.05,
    release: 0.8,
    volume: 31
  }),
  harp: sampler('harp', BASS_NOTES, { release: 1, volume: 11 }),
  'soft-sine': synth(
    () =>
      new Tone.PolySynth(Tone.Synth, {
        volume: -11,
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.4 }
      })
  ),

  // extra
  'fm-keys': synth(
    () =>
      new Tone.PolySynth(Tone.FMSynth, {
        volume: 2,
        harmonicity: 3,
        modulationIndex: 4,
        oscillator: { type: 'sine' },
        modulation: { type: 'sine' },
        envelope: { attack: 0.005, decay: 1.2, sustain: 0.2, release: 1.2 },
        modulationEnvelope: {
          attack: 0.005,
          decay: 0.5,
          sustain: 0.1,
          release: 0.5
        }
      })
  ),
  'fm-piano': sampler('fm-piano', EXTRA_NOTES, { release: 1.2, volume: 14 }),
  glockenspiel: sampler('glockenspiel', EXTRA_NOTES, {
    release: 1.5,
    volume: 15
  }),
  kalimba: sampler('kalimba', EXTRA_NOTES, { release: 1.2, volume: 15 })
}

export const AVAILABLE_INSTRUMENTS = Object.keys(INSTRUMENTS)

// Создаёт инструмент. Возвращает { instrument, loaded }, где loaded —
// промис, который выполняется, когда сэмплы загружены (у синтов — сразу)
export function createInstrument(id) {
  const spec = INSTRUMENTS[id]

  if (!spec) {
    return {
      instrument: null,
      loaded: Promise.reject(new Error(`Нет инструмента «${id}»`))
    }
  }

  if (spec.kind === 'synth') {
    return { instrument: spec.create(), loaded: Promise.resolve() }
  }

  let instrument
  const loaded = new Promise((resolve, reject) => {
    instrument = new Tone.Sampler({
      ...spec.options,
      urls: sampleUrls(spec.notes),
      baseUrl: `${SAMPLES_URL}${spec.folder}/`,
      onload: resolve,
      onerror: reject
    })
  })

  return { instrument, loaded }
}
