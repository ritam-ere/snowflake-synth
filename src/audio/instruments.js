// Инструменты голосов. Каждая фабрика возвращает полифонический инструмент Tone:
// у лида ноты перекрываются (легато), монофонический синт их бы обрывал.

import * as Tone from 'tone'

import organGb1 from '../assets/samples/church-organ/Gb1.mp3'
import organA1 from '../assets/samples/church-organ/A1.mp3'
import organC2 from '../assets/samples/church-organ/C2.mp3'
import organEb2 from '../assets/samples/church-organ/Eb2.mp3'
import organGb2 from '../assets/samples/church-organ/Gb2.mp3'
import organA2 from '../assets/samples/church-organ/A2.mp3'
import organC3 from '../assets/samples/church-organ/C3.mp3'

import pianoEb3 from '../assets/samples/electric-piano/Eb3.mp3'
import pianoGb3 from '../assets/samples/electric-piano/Gb3.mp3'
import pianoA3 from '../assets/samples/electric-piano/A3.mp3'
import pianoC4 from '../assets/samples/electric-piano/C4.mp3'
import pianoEb4 from '../assets/samples/electric-piano/Eb4.mp3'
import pianoGb4 from '../assets/samples/electric-piano/Gb4.mp3'

// Громкость (volume, дБ) подобрана замером: пики голосов около −10 дБ,
// бас чуть тише лида. Сэмплы soundfont записаны тихо, поэтому усилены

// Настройки синтезируемых инструментов
const fmKeysSettings = {
  volume: 2,
  harmonicity: 3,
  modulationIndex: 4,
  oscillator: { type: 'sine' },
  modulation: { type: 'sine' },
  envelope: {
    attack: 0.005,
    decay: 1.2,
    sustain: 0.2,
    release: 1.2
  },
  modulationEnvelope: {
    attack: 0.005,
    decay: 0.5,
    sustain: 0.1,
    release: 0.5
  }
}

const INSTRUMENTS = {
  // Электропиано — аналог Whirly из BandLab (lead)
  whirly: () =>
    new Tone.Sampler({
      urls: {
        'D#3': pianoEb3,
        'F#3': pianoGb3,
        A3: pianoA3,
        C4: pianoC4,
        'D#4': pianoEb4,
        'F#4': pianoGb4
      },
      release: 1.2,
      volume: 12
    }),

  // Церковный орган (bass)
  'church-organ': () =>
    new Tone.Sampler({
      urls: {
        'F#1': organGb1,
        A1: organA1,
        C2: organC2,
        'D#2': organEb2,
        'F#2': organGb2,
        A2: organA2,
        C3: organC3
      },
      attack: 0.02,
      release: 0.4,
      volume: 12
    }),

  // FM keys (extra) — синтез, сэмплов не нужно
  'fm-keys': () => new Tone.PolySynth(Tone.FMSynth, fmKeysSettings)
}

// Инструменты, которые уже можно создать (остальные — в задаче 1.3)
export const AVAILABLE_INSTRUMENTS = Object.keys(INSTRUMENTS)

export function createInstrument(id) {
  const factory = INSTRUMENTS[id]

  if (!factory) {
    throw new Error(`Инструмент «${id}» ещё не подключён`)
  }

  return factory()
}
