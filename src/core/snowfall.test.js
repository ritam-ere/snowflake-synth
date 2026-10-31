import { describe, expect, test } from 'bun:test'

import {
  SHAPES,
  candidateColumns,
  PULSE,
  cellsPerBeat,
  ease,
  breath,
  variantCells,
  variantRadius,
  pickColumn,
  pulseTravel,
  shapeCells,
  shapeFor,
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

  test('тяжёлая снежинка падает быстрее лёгкой', () => {
    const big = SHAPES.findIndex((sh) => sh.r === 5)
    const small = SHAPES.findIndex((sh) => sh.r === 1)
    expect(weightOf(big, 1)).toBeGreaterThan(weightOf(small, 0))
    expect(cellsPerBeat(weightOf(big, 1))).toBeGreaterThan(
      cellsPerBeat(weightOf(small, 0))
    )
  })
})

describe('ритм и плавность', () => {
  test('за целую долю путь ровно одна доля, внутри доли — пульс', () => {
    expect(pulseTravel(3, 4)).toBeCloseTo(1)
    // сразу после доли снежинка движется быстрее, перед следующей — медленнее
    expect(pulseTravel(0, 0.1)).toBeGreaterThan(0.1)
    expect(pulseTravel(0.4, 0.5)).toBeLessThan(0.1)
  })

  test('движение монотонное: снежинка никогда не останавливается и не идёт вверх', () => {
    expect(PULSE).toBeLessThan(1)
    for (let b = 0; b < 2; b += 0.05) {
      expect(pulseTravel(b, b + 0.05)).toBeGreaterThan(0)
    }
  })

  test('параметры эффектов меняются плавно, без скачков', () => {
    const half = ease(0, 1, 0.25)
    expect(half).toBeGreaterThan(0.5)
    expect(half).toBeLessThan(0.7)
    expect(ease(0, 1, 0.016)).toBeLessThan(0.1)
  })
})

describe('где появляется', () => {
  test('кандидаты — по всей ширине, но с отступом от краёв', () => {
    let k = 0
    const rand = () => [0, 0.5, 1][k++ % 3]
    const cols = candidateColumns(60, 3, 0, rand, 3)
    expect(cols[0]).toBe(7)
    expect(cols[2]).toBe(60 - 7 - 1)
    expect(cols[1]).toBeGreaterThan(20)
  })

  test('новая снежинка не встаёт под медленную и не слипается у верхнего края', () => {
    const flakes = [
      { col: 10, r: 3, row: 80, speed: 1 }, // ниже и медленнее — догонит
      { col: 30, r: 3, row: 2, speed: 3 }, // у верхнего края
      { col: 50, r: 3, row: 80, speed: 4 } // ниже и быстрее — не мешает
    ]
    const options = { r: 3, speed: 2, topRows: 18 }
    expect(pickColumn([10, 30, 50], flakes, options)).toBe(50)
    expect(pickColumn([10, 30, 20], flakes, options)).toBe(20)
  })
})

describe('вариации формы', () => {
  const index = SHAPES.findIndex((sh) => sh.r === 3)
  const count = (v) => variantCells(index, v).length

  test('ореол, шипы и шум добавляют пиксели и раздвигают снежинку', () => {
    const plain = count({})
    expect(count({ halo: 1 })).toBeGreaterThan(plain)
    expect(count({ halo: 2 })).toBeGreaterThan(count({ halo: 1 }))
    expect(count({ halo: 2, haloDotted: true })).toBeLessThan(
      count({ halo: 2 })
    )
    expect(count({ spikes: 2 })).toBeGreaterThan(plain)
    expect(count({ noise: 3 })).toBeGreaterThan(plain)
    expect(variantRadius(index, { halo: 2 })).toBe(6)
    expect(variantRadius(index, { spikes: 3 })).toBe(6)
  })

  test('вариации симметричны, как сама снежинка', () => {
    const cells = variantCells(index, {
      halo: 2,
      spikes: 2,
      noise: 6,
      noiseSeed: 1
    })
    const set = new Set(cells.map(([x, y]) => `${x},${y}`))
    cells.forEach(([x, y]) => {
      expect(set.has(`${-x},${y}`)).toBe(true)
      expect(set.has(`${y},${x}`)).toBe(true)
    })
  })

  test('шум мерцает: другой вариант — другие пиксели', () => {
    const key = (seed) =>
      variantCells(index, { noise: 3, noiseSeed: seed })
        .map(([x, y]) => `${x},${y}`)
        .sort()
        .join('|')
    expect(key(0)).not.toBe(key(1))
    expect(key(2)).toBe(key(2))
  })

  test('эхо-копия — каждый второй пиксель', () => {
    expect(count({ echo: true })).toBeLessThan(count({}))
  })

  test('дыхание двойника Chorus зависит от формы волны', () => {
    expect(breath('sine', 0)).toBeCloseTo(0)
    expect(breath('sine', 0.5)).toBeCloseTo(1)
    expect(breath('triangle', 0.25)).toBeCloseTo(0.5)
    expect(breath('square', 0.2)).toBe(1)
    expect(breath('square', 0.7)).toBe(0.25)
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
      sizeShift: 0,
      halo: 0,
      spikes: 0,
      noise: 0,
      double: 0,
      wobble: 0,
      spin: 0,
      echoes: 0,
      lightness: 1
    })
  })

  test('у каждого эффекта свой знак', () => {
    expect(lookWith('pitchShift', { interval: -12 }).sizeShift).toBe(1)
    expect(lookWith('pitchShift', { interval: 12 }).sizeShift).toBe(-1)
    expect(lookWith('reverb').halo).toBeGreaterThan(0)
    expect(lookWith('reverb').lightness).toBeLessThan(1)
    expect(lookWith('distortion').spikes).toBeGreaterThan(0)
    expect(lookWith('distortion').noise).toBeGreaterThan(0)
    expect(lookWith('chorus').double).toBeGreaterThan(0)
    expect(lookWith('vibrato').wobble).toBeGreaterThan(0)
    expect(lookWith('phaser').spin).toBeGreaterThan(0)
    expect(lookWith('delay').echoes).toBeGreaterThan(0)
  })

  test('каждый контрол меняет свою черту', () => {
    const more = (type, param, low, high, key) =>
      expect(lookWith(type, { [param]: high })[key]).toBeGreaterThan(
        lookWith(type, { [param]: low })[key]
      )
    more('reverb', 'decay', 0, 1, 'halo')
    expect(lookWith('reverb', { mix: 0.3 }).haloDotted).toBe(true)
    expect(lookWith('reverb', { mix: 1 }).haloDotted).toBe(false)
    more('distortion', 'drive', 0, 1, 'noise')
    more('distortion', 'tone', 1000, 12000, 'flicker')
    more('chorus', 'depth', 0, 1, 'double')
    more('chorus', 'rate', 0.1, 8, 'doubleRate')
    expect(lookWith('chorus', { wave: 'square' }).doubleWave).toBe('square')
    more('vibrato', 'depth', 0, 1, 'wobble')
    more('vibrato', 'rate', 1, 10, 'wobbleRate')
    more('phaser', 'freq', 0.1, 4, 'spin')
    more('phaser', 'oct', 1, 5, 'swing')
    more('delay', 'feedback', 0, 0.95, 'echoes')
    expect(lookWith('delay', { timeL: '2n' }).echoBeats[0]).toBe(2)
    expect(lookWith('delay', { timeR: '8n' }).echoBeats[1]).toBe(0.5)
    expect(lookWith('delay', { pingPong: false }).pingPong).toBe(false)
  })

  test('Mix 0 — эффект не действует', () => {
    expect(lookWith('reverb', { mix: 0 }).halo).toBe(0)
  })

  test('Delay: эхо-копий не больше двух', () => {
    expect(
      lookWith('delay', { feedback: 0.95, mix: 1 }).echoes
    ).toBeLessThanOrEqual(2)
  })
})
