import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  loopLengthTicks,
  midiToEvents,
  midiToNoteName,
  parseMidi
} from './midi.js'

function load(name) {
  const file = readFileSync(join(import.meta.dir, '../data/midi', name))
  return parseMidi(
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)
  )
}

const lead = load('lead.mid')
const bass = load('bass.mid')
const extra = load('extra.mid')

describe('Имена нот', () => {
  test('60 → C4, 29 → F1, 70 → A#4', () => {
    expect(midiToNoteName(60)).toBe('C4')
    expect(midiToNoteName(29)).toBe('F1')
    expect(midiToNoteName(70)).toBe('A#4')
  })
})

describe('Общие параметры дорожек', () => {
  test('80 BPM, 4/4, цикл 4 такта', () => {
    ;[lead, bass, extra].forEach((m) => {
      expect(m.bpm).toBe(80)
      expect(m.timeSignature).toEqual([4, 4])
      expect(m.endTicks).toBe(m.ppq * 4 * 4)
    })
  })

  test('длина цикла в тиках Tone = 4 такта (192 × 16)', () => {
    expect(loopLengthTicks(lead)).toBe(192 * 16)
  })
})

describe('Lead', () => {
  test('30 нот, D3–F4', () => {
    const midis = lead.notes.map((n) => n.midi)
    expect(lead.notes.length).toBe(30)
    expect(midiToNoteName(Math.min(...midis))).toBe('D3')
    expect(midiToNoteName(Math.max(...midis))).toBe('F4')
  })

  test('мелодия начинается с затакта: третья доля первого такта', () => {
    expect(lead.notes[0].ticks).toBe(lead.ppq * 2)
    expect(midiToNoteName(lead.notes[0].midi)).toBe('F4')
  })

  test('есть перекрывающиеся ноты (легато) — голосу нужна полифония', () => {
    const overlaps = lead.notes.some((a, i) =>
      lead.notes.slice(i + 1).some((b) => b.ticks < a.ticks + a.durationTicks)
    )
    expect(overlaps).toBe(true)
  })
})

describe('Bass', () => {
  test('64 ноты, F1–C3, ровные шестнадцатые', () => {
    const midis = bass.notes.map((n) => n.midi)
    expect(bass.notes.length).toBe(64)
    expect(midiToNoteName(Math.min(...midis))).toBe('F1')
    expect(midiToNoteName(Math.max(...midis))).toBe('C3')
    bass.notes.forEach((n, i) => expect(n.ticks).toBe((i * bass.ppq) / 4))
  })
})

describe('Extra', () => {
  test('та же мелодия, что lead, ровно на октаву выше', () => {
    expect(extra.notes.length).toBe(lead.notes.length)
    extra.notes.forEach((n, i) => expect(n.midi).toBe(lead.notes[i].midi + 12))
  })
})

describe('События для Tone.Part', () => {
  test('время и длительность в тиках Tone, громкость 0–1', () => {
    const events = midiToEvents(bass)
    expect(events[0]).toEqual({
      time: '0i',
      note: 'F1',
      duration: '48i',
      velocity: 0.748
    })
    expect(events[1].time).toBe('48i')
  })

  test('все события лежат внутри цикла', () => {
    const loop = loopLengthTicks(lead)
    midiToEvents(lead).forEach((e) => {
      expect(parseInt(e.time)).toBeLessThan(loop)
      expect(parseInt(e.time) + parseInt(e.duration)).toBeLessThanOrEqual(loop)
    })
  })
})
