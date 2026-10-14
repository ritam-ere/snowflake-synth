import { describe, expect, test } from 'bun:test'

import {
  BRICK_H,
  STRIP_H,
  STRIP_W,
  bricks,
  wavePath,
  wavePeriods
} from './stripMath.js'

describe('Rate: волна', () => {
  test('выше значение — гуще волна', () => {
    expect(wavePeriods(1)).toBeGreaterThan(wavePeriods(0.5))
    expect(wavePeriods(0)).toBe(0.5)
  })

  test('под бегунком всегда гребень при нулевой фазе', () => {
    const path = wavePath(0.5, 0, 78, 78)
    // точки: x = 0, 78, 156; в x = 78 — гребень (y = 12.5 − 11)
    expect(path).toContain('78.0 1.50')
  })

  test('сдвиг фазы на целый оборот даёт ту же волну — бег бесшовный', () => {
    expect(wavePath(0.3, 1, 40)).toBe(wavePath(0.3, 0, 40))
  })
})

describe('Oct: кирпичики', () => {
  test('на минимуме все в один ряд по средней линии', () => {
    const ys = bricks(0).map((b) => b.y)
    expect(new Set(ys).size).toBe(1)
    expect(ys[0]).toBeCloseTo((STRIP_H - BRICK_H) / 2)
  })

  test('на максимуме расходятся, но не выходят за полоску', () => {
    const all = bricks(1)
    expect(new Set(all.map((b) => b.y)).size).toBe(9)
    all.forEach((b) => {
      expect(b.y).toBeGreaterThanOrEqual(0)
      expect(b.y + BRICK_H).toBeLessThanOrEqual(STRIP_H)
    })
  })

  test('разброс растёт пропорционально и не мерцает', () => {
    const half = bricks(0.5)
    const full = bricks(1)
    const mid = (STRIP_H - BRICK_H) / 2
    half.forEach((b, i) => {
      expect(b.y - mid).toBeCloseTo((full[i].y - mid) / 2)
    })
    expect(bricks(0.5)).toEqual(half)
  })

  test('9 кирпичиков на всю ширину', () => {
    const all = bricks(0)
    expect(all.length).toBe(9)
    expect(all[8].x + 15).toBeCloseTo(STRIP_W)
  })
})
