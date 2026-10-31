import { describe, expect, test } from 'bun:test'

import {
  SHAPES,
  shapeCells,
  shapeFor,
  spawnX,
  stepSeconds,
  voiceLook,
  weightOf
} from './snowfall.js'
import { createInitialState, reducer } from './state.js'

const run = (state, ...actions) => actions.reduce(reducer, state)

describe('формы снежинок', () => {
  test('каждая форма симметрична по осям и диагоналям', () => {
    SHAPES.forEach((shape, i) => {
      const cells = shapeCells(i)
      const set = new Set(cells.map(([x, y]) => `${x},${y}`))
      cells.forEach(([x, y]) => {
        for (const [a, b] of [
          [-x, y],
          [x, -y],
          [y, x]
        ]) {
          expect(set.has(`${a},${b}`)).toBe(true)
        }
      })
    })
  })

  test('клетки не выходят за радиус формы', () => {
    SHAPES.forEach((shape, i) => {
      shapeCells(i).forEach(([x, y]) => {
        expect(Math.max(Math.abs(x), Math.abs(y))).toBeLessThanOrEqual(shape.r)
      })
    })
  })

  test('формы не повторяются', () => {
    const forms = SHAPES.map((_, i) =>
      shapeCells(i)
        .map(([x, y]) => `${x},${y}`)
        .sort()
        .join('|')
    )
    expect(new Set(forms).size).toBe(SHAPES.length)
  })
})

describe('нота → снежинка', () => {
  test('бас — большие, lead — средние, extra — маленькие', () => {
    expect(SHAPES[shapeFor('bass', 33)].r).toBeGreaterThanOrEqual(4)
    expect(SHAPES[shapeFor('lead', 55)].r).toBe(3)
    expect(SHAPES[shapeFor('extra', 70)].r).toBeLessThanOrEqual(2)
  })

  test('одна и та же нота — одна и та же снежинка, разные ноты — разные', () => {
    expect(shapeFor('lead', 57)).toBe(shapeFor('lead', 57))
    const forms = new Set(
      [50, 52, 53, 55, 57, 59].map((m) => shapeFor('lead', m))
    )
    expect(forms.size).toBeGreaterThan(3)
  })

  test('Pitch Shift сдвигает размер на ступень', () => {
    expect(SHAPES[shapeFor('extra', 70, 1)].r).toBe(3)
    expect(SHAPES[shapeFor('bass', 33, -1)].r).toBe(3)
    expect(SHAPES[shapeFor('bass', 33, 1)].r).toBeGreaterThanOrEqual(4)
  })

  test('снежинка появляется внутри панели, панорама сдвигает её вбок', () => {
    for (const r of [0, 0.5, 1]) {
      const x = spawnX(50, 0, r)
      expect(x).toBeGreaterThanOrEqual(0.1)
      expect(x).toBeLessThanOrEqual(0.9)
    }
    expect(spawnX(50, -1, 0.5)).toBeLessThan(spawnX(50, 1, 0.5))
  })

  test('тяжёлая снежинка падает быстрее лёгкой', () => {
    const big = SHAPES.findIndex((s) => s.r === 5)
    const small = SHAPES.findIndex((s) => s.r === 1)
    expect(weightOf(big, 0.5)).toBeGreaterThan(weightOf(small, 0.5))
    expect(stepSeconds(weightOf(big, 0.5))).toBeLessThan(
      stepSeconds(weightOf(small, 0.5))
    )
  })
})

describe('эффекты голоса → падение', () => {
  function lookWith(type, settings = {}) {
    let s = run(
      { ...createInitialState(), links: [] },
      { type: 'ADD_NODES', types: [type] },
      { type: 'LINK', voice: 'lead', nodeId: 'n5' }
    )
    Object.entries(settings).forEach(([param, value]) => {
      s = reducer(s, {
        type: 'CHANGE',
        property: ['nodes', 'n5', 'settings', param],
        value
      })
    })
    return voiceLook(s, 'lead')
  }

  test('без эффектов снежинка просто падает', () => {
    const look = voiceLook({ ...createInitialState(), links: [] }, 'lead')
    expect(look).toMatchObject({
      wobble: 0,
      drift: 0,
      lightness: 1,
      echoes: 0,
      jitter: 0,
      sizeShift: 0
    })
  })

  test('каждый эффект меняет своё свойство падения', () => {
    expect(lookWith('vibrato').wobble).toBeGreaterThan(0)
    expect(lookWith('chorus').wobble).toBeGreaterThan(0)
    expect(lookWith('phaser').drift).toBeGreaterThan(0)
    expect(lookWith('reverb').lightness).toBeLessThan(1)
    expect(lookWith('delay').echoes).toBeGreaterThan(0)
    expect(lookWith('distortion').jitter).toBeGreaterThan(0)
    expect(lookWith('distortion').lightness).toBeGreaterThan(1)
    expect(lookWith('pitchShift', { interval: -12 }).sizeShift).toBe(1)
    expect(lookWith('pitchShift', { interval: 12 }).sizeShift).toBe(-1)
  })

  test('Mix 0 — эффект на падение не влияет', () => {
    expect(lookWith('reverb', { mix: 0 }).lightness).toBe(1)
  })

  test('Delay: эхо не больше двух', () => {
    expect(
      lookWith('delay', { feedback: 0.95, mix: 1 }).echoes
    ).toBeLessThanOrEqual(2)
  })
})
