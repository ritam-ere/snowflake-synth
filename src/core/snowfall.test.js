import { describe, expect, test } from 'bun:test'

import { flakeShape, flakeSize, random, spawnX, voiceLook } from './snowfall.js'
import { createInitialState, reducer } from './state.js'

const run = (state, ...actions) => actions.reduce(reducer, state)

// Ключ пикселя для сравнения наборов точек
const key = ({ x, y }) => `${Math.round(x * 100)},${Math.round(y * 100)}`

describe('форма снежинки', () => {
  test('шестилучевая симметрия: поворот на 60° и отражение не меняют снежинку', () => {
    for (let n = 0; n < 40; n++) {
      const dots = flakeShape(random(n / 40)(), 2 + (n % 5))
      const set = new Set(dots.map(key))
      const cos = Math.cos(Math.PI / 3)
      const sin = Math.sin(Math.PI / 3)
      dots.forEach(({ x, y }) => {
        expect(
          set.has(key({ x: x * cos - y * sin, y: x * sin + y * cos }))
        ).toBe(true)
        expect(set.has(key({ x, y: -y }))).toBe(true)
      })
    }
  })

  test('один сид — одна снежинка; разные сиды дают разные формы', () => {
    expect(flakeShape(0.42, 5)).toEqual(flakeShape(0.42, 5))
    const forms = new Set(
      Array.from({ length: 30 }, (_, i) =>
        flakeShape(i / 30, 5)
          .map(key)
          .sort()
          .join('|')
      )
    )
    expect(forms.size).toBeGreaterThan(3)
  })

  test('пиксели не выходят за длину луча', () => {
    flakeShape(0.7, 4).forEach((dot) => expect(dot.ring).toBeLessThanOrEqual(4))
  })
})

describe('нота → снежинка', () => {
  test('бас — крупнее, верхний голос — мельче', () => {
    expect(flakeSize('bass', 30)).toBeGreaterThan(flakeSize('lead', 55))
    expect(flakeSize('lead', 55)).toBeGreaterThan(flakeSize('extra', 75))
  })

  test('снежинка появляется внутри панели, панорама сдвигает её вбок', () => {
    for (const r of [0, 0.5, 1]) {
      const x = spawnX(50, 0, r)
      expect(x).toBeGreaterThanOrEqual(0.1)
      expect(x).toBeLessThanOrEqual(0.9)
    }
    expect(spawnX(50, -1, 0.5)).toBeLessThan(spawnX(50, 1, 0.5))
  })
})

describe('эффекты голоса → полёт', () => {
  // Голос без эффектов и голос с одной нодой заданного типа
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
      sway: 0,
      spin: 0,
      trail: 0,
      echoes: 0,
      twinkle: 0,
      scale: 1
    })
  })

  test('каждый эффект меняет только своё свойство полёта', () => {
    expect(lookWith('vibrato').sway).toBeGreaterThan(0)
    expect(lookWith('chorus').sway).toBeGreaterThan(0)
    expect(lookWith('phaser').spin).toBeGreaterThan(0)
    expect(lookWith('reverb').trail).toBeGreaterThan(0)
    expect(lookWith('delay').echoes).toBeGreaterThan(0)
    expect(lookWith('distortion').twinkle).toBeGreaterThan(0)
    expect(lookWith('pitchShift', { interval: -12 }).scale).toBeGreaterThan(1)
    expect(lookWith('pitchShift', { interval: 12 }).scale).toBeLessThan(1)
  })

  test('Mix 0 — эффект на полёт не влияет', () => {
    expect(lookWith('reverb', { mix: 0 }).trail).toBe(0)
  })

  test('Delay: Feedback — больше эха, но не больше двух', () => {
    expect(lookWith('delay', { feedback: 0.95 }).echoes).toBeGreaterThan(
      lookWith('delay', { feedback: 0 }).echoes
    )
    expect(
      lookWith('delay', { feedback: 0.95, mix: 1 }).echoes
    ).toBeLessThanOrEqual(2)
  })
})
