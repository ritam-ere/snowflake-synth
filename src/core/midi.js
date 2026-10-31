// Чтение MIDI-файлов (Standard MIDI File, формат 0 и 1).
// Чистые функции без зависимостей: на вход ArrayBuffer, на выход ноты в тиках.

const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B'
]

// 60 → 'C4'
export function midiToNoteName(midi) {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`
}

// Число переменной длины (VLQ) из MIDI-потока
function readVarLen(bytes, pos) {
  let value = 0
  let byte

  do {
    byte = bytes[pos++]
    value = (value << 7) | (byte & 0x7f)
  } while (byte & 0x80)

  return [value, pos]
}

function readString(bytes, start, length) {
  return String.fromCharCode(...bytes.slice(start, start + length))
}

// Разбор одной дорожки: ноты, темп, размер, конец дорожки
function parseTrack(bytes, start, end, result) {
  let pos = start
  let tick = 0
  let runningStatus = null
  const openNotes = new Map() // midi → { ticks, velocity }

  while (pos < end) {
    let delta
    ;[delta, pos] = readVarLen(bytes, pos)
    tick += delta

    let status = bytes[pos]

    // Мета-событие
    if (status === 0xff) {
      const type = bytes[pos + 1]
      let length
      ;[length, pos] = readVarLen(bytes, pos + 2)
      const data = bytes.slice(pos, pos + length)
      pos += length

      if (type === 0x51) {
        const microseconds = (data[0] << 16) | (data[1] << 8) | data[2]
        result.bpm = Math.round((60000000 / microseconds) * 1000) / 1000
      } else if (type === 0x58) {
        result.timeSignature = [data[0], 2 ** data[1]]
      } else if (type === 0x2f) {
        result.endTicks = Math.max(result.endTicks, tick)
      }
      continue
    }

    // SysEx — пропускаем
    if (status === 0xf0 || status === 0xf7) {
      let length
      ;[length, pos] = readVarLen(bytes, pos + 1)
      pos += length
      continue
    }

    // Обычное событие канала (с поддержкой running status)
    if (status & 0x80) {
      runningStatus = status
      pos++
    } else {
      status = runningStatus
    }

    const kind = status & 0xf0
    const twoDataBytes = kind !== 0xc0 && kind !== 0xd0

    const a = bytes[pos]
    const b = twoDataBytes ? bytes[pos + 1] : 0
    pos += twoDataBytes ? 2 : 1

    const isNoteOn = kind === 0x90 && b > 0
    const isNoteOff = kind === 0x80 || (kind === 0x90 && b === 0)

    if (isNoteOn) {
      openNotes.set(a, { ticks: tick, velocity: b })
    } else if (isNoteOff && openNotes.has(a)) {
      const open = openNotes.get(a)
      openNotes.delete(a)
      result.notes.push({
        ticks: open.ticks,
        durationTicks: tick - open.ticks,
        midi: a,
        velocity: open.velocity
      })
    }
  }
}

// ArrayBuffer → { ppq, bpm, timeSignature, endTicks, notes }
export function parseMidi(buffer) {
  const bytes = new Uint8Array(buffer)

  if (readString(bytes, 0, 4) !== 'MThd') {
    throw new Error('Это не MIDI-файл: нет заголовка MThd')
  }

  const view = new DataView(
    buffer instanceof ArrayBuffer ? buffer : bytes.buffer
  )
  const trackCount = view.getUint16(10)
  const ppq = view.getUint16(12)

  const result = {
    ppq,
    bpm: 120,
    timeSignature: [4, 4],
    endTicks: 0,
    notes: []
  }

  let pos = 14

  for (let i = 0; i < trackCount; i++) {
    if (readString(bytes, pos, 4) !== 'MTrk') {
      throw new Error(`Повреждённая дорожка ${i}`)
    }

    const length = view.getUint32(pos + 4)
    parseTrack(bytes, pos + 8, pos + 8 + length, result)
    pos += 8 + length
  }

  result.notes.sort((x, y) => x.ticks - y.ticks || x.midi - y.midi)
  return result
}

// Ноты MIDI → события для Tone.Part.
// Время в тиках Tone ('123i'), поэтому мелодия не зависит от темпа
export function midiToEvents(midi, tonePpq = 192) {
  const scale = tonePpq / midi.ppq
  const toTicks = (t) => `${Math.round(t * scale)}i`

  return midi.notes.map((note) => ({
    time: toTicks(note.ticks),
    note: midiToNoteName(note.midi),
    midi: note.midi,
    duration: toTicks(note.durationTicks),
    velocity: Math.round((note.velocity / 127) * 1000) / 1000
  }))
}

// Длина цикла в тиках Tone
export function loopLengthTicks(midi, tonePpq = 192) {
  return Math.round((midi.endTicks * tonePpq) / midi.ppq)
}
