import { describe, expect, test } from 'bun:test'

import { EFFECTS, EFFECT_TYPES } from './effects.js'
import { STYLE_IDS, motif } from './motifs/index.js'
import { snowflakePattern } from './snowflake.js'
import { createInitialState, reducer } from './state.js'

const apply = (state, ...actions) => actions.reduce(reducer, state)

// Вырез одного эффекта, подключённого к голосу lead, с заданными настройками
function cutOf(type, settings = {}) {
  let state = { ...createInitialState(), links: [] }
  state = apply(state, { type: 'ADD_NODES', types: [type] })
  const id = Object.keys(state.nodes).find((n) => state.nodes[n].type === type)
  state = apply(state, { type: 'LINK', voice: 'lead', nodeId: id })
  for (const [param, value] of Object.entries(settings)) {
    state = apply(state, {
      type: 'CHANGE',
      property: ['nodes', id, 'settings', param],
      value
    })
  }
  return snowflakePattern(state).find((c) => c.nodeId === id)
}

// Крайние значения параметра
function extremes(spec) {
  // Mix 0 выключает вырез совсем, поэтому берём чуть больше нуля
  if (spec.kind === 'range')
    return [spec.min || (spec.max - spec.min) * 0.05, spec.max]
  if (spec.kind === 'toggle') return [false, true]
  return [
    spec.options[0].value ?? spec.options[0],
    spec.options.at(-1).value ?? spec.options.at(-1)
  ]
}

for (const style of STYLE_IDS) {
  describe(`мотивы вырезов: ${style}`, () => {
    for (const type of EFFECT_TYPES) {
      test(`${type}: есть фигуры, результат детерминирован`, () => {
        const cut = cutOf(type)
        const shapes = motif(cut, style)
        expect(shapes.length).toBeGreaterThan(1)
        expect(motif(cut, style)).toEqual(shapes)
      })

      for (const [param, spec] of Object.entries(EFFECTS[type].params)) {
        test(`${type}: ${param} меняет вырез`, () => {
          const [low, high] = extremes(spec)
          // для delay Time заметен только при нескольких повторах
          const base = type === 'delay' ? { feedback: 1 } : {}
          const a = motif(cutOf(type, { ...base, [param]: low }), style)
          const b = motif(cutOf(type, { ...base, [param]: high }), style)
          expect(a).not.toEqual(b)
        })
      }
    }

    test('ажур: вырез открывает область, дальше только бумага', () => {
      for (const type of EFFECT_TYPES) {
        const shapes = motif(cutOf(type), style)
        expect(shapes[0].paper).toBeUndefined()
        expect(shapes.slice(1).every((s) => s.paper)).toBe(true)
      }
    })
  })
}

describe('мотивы вырезов: геометрия', () => {
  test('pitchShift: −12 / +7 / +12 — звезда в 4 / 5 / 6 лучей', () => {
    for (const [interval, rays] of [
      [-12, 4],
      [7, 5],
      [12, 6]
    ]) {
      const star = motif(cutOf('pitchShift', { interval }))[2]
      expect(star.d.split('L').length).toBe(rays * 2 + 1)
    }
  })

  test('reverb: чем дольше Decay, тем больше колец', () => {
    const rings = (decay) =>
      motif(cutOf('reverb', { decay })).filter((s) => s.shape === 'circle')
    expect(rings(0).length).toBe(1)
    expect(rings(1).length).toBeGreaterThan(3)
  })

  test('неизвестный стиль — геометрия', () => {
    const cut = cutOf('reverb')
    expect(motif(cut, 'nope')).toEqual(motif(cut, 'geometry'))
  })

  test('Mix делает узор тоньше', () => {
    const width = (mix) => motif(cutOf('reverb', { mix }))[1].stroke
    expect(width(1)).toBeLessThan(width(0.1))
  })
})
