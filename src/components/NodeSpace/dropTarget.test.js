import { describe, expect, test } from 'bun:test'

import { dropTarget } from './dropTarget.js'

// Две колонки по 200px через 16px; в первой две карточки, во второй одна
const columns = [
  {
    left: 0,
    right: 200,
    cards: [
      { id: 'n1', top: 0, bottom: 168 },
      { id: 'n5', top: 184, bottom: 390 }
    ]
  },
  { left: 216, right: 416, cards: [{ id: 'n2', top: 0, bottom: 269 }] }
]

describe('куда положить ноду', () => {
  test('над верхней половиной первой карточки — в начало колонки', () => {
    expect(dropTarget(columns, 'n2', 100, 40)).toEqual({ column: 0, index: 0 })
  })

  test('между карточками', () => {
    expect(dropTarget(columns, 'n2', 100, 200)).toEqual({ column: 0, index: 1 })
  })

  test('ниже всех — в конец колонки', () => {
    expect(dropTarget(columns, 'n2', 100, 600)).toEqual({ column: 0, index: 2 })
  })

  test('своя карточка не считается: внутри колонки индекс без неё', () => {
    expect(dropTarget(columns, 'n1', 100, 600)).toEqual({ column: 0, index: 1 })
    expect(dropTarget(columns, 'n5', 100, 10)).toEqual({ column: 0, index: 0 })
  })

  test('в зазоре между колонками — ближайшая колонка', () => {
    expect(dropTarget(columns, 'n1', 210, 50).column).toBe(1)
    expect(dropTarget(columns, 'n1', 205, 50).column).toBe(0)
  })

  test('за краем поля — крайняя колонка', () => {
    expect(dropTarget(columns, 'n1', -50, 50).column).toBe(0)
    expect(dropTarget(columns, 'n1', 900, 50)).toEqual({ column: 1, index: 0 })
  })
})
