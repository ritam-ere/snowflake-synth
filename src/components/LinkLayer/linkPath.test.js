import { expect, test } from 'bun:test'

import { linkPath } from './linkPath.js'

test('кривая начинается в точке голоса и кончается у цели', () => {
  const path = linkPath({ x: 10, y: 20 }, { x: 110, y: 320 })
  expect(path.startsWith('M 10 20 ')).toBe(true)
  expect(path.endsWith('110 320')).toBe(true)
  // контрольные точки: вниз от голоса и сверху от цели
  expect(path).toContain('C 10 170, 110 170')
})

test('даже рядом с голосом кривая уходит вниз минимум на 40px', () => {
  expect(linkPath({ x: 0, y: 0 }, { x: 50, y: 10 })).toContain('C 0 40, 50 -30')
})
