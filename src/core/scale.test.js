import { describe, expect, test } from 'bun:test'

import { fromNormal, formatValue, toNormal } from './scale.js'

const percent = { min: 0, max: 1 }
const rate = { min: 0.1, max: 4, scale: 'log' }

describe('нормализация', () => {
  test('линейная шкала: туда и обратно', () => {
    expect(toNormal(0.4, percent)).toBeCloseTo(0.4)
    expect(fromNormal(0.75, { min: 0, max: 0.85 })).toBeCloseTo(0.6375)
    expect(
      toNormal(fromNormal(0.33, { min: 1, max: 5 }), { min: 1, max: 5 })
    ).toBeCloseTo(0.33)
  })

  test('логарифмическая шкала для Гц', () => {
    expect(fromNormal(0, rate)).toBeCloseTo(0.1)
    expect(fromNormal(1, rate)).toBeCloseTo(4)
    // середина хода — среднее геометрическое, а не арифметическое
    expect(fromNormal(0.5, rate)).toBeCloseTo(Math.sqrt(0.1 * 4))
    expect(toNormal(1.5, rate)).toBeCloseTo(Math.log(15) / Math.log(40))
  })

  test('значения за пределами диапазона прижимаются к краям', () => {
    expect(toNormal(2, percent)).toBe(1)
    expect(toNormal(-1, percent)).toBe(0)
    expect(fromNormal(1.4, percent)).toBe(1)
  })

  test('дробные значения сохраняются', () => {
    expect(fromNormal(0.123, percent)).toBeCloseTo(0.123)
  })
})

describe('подписи', () => {
  test('единицы', () => {
    expect(formatValue(0.4, { unit: '%' })).toBe('40%')
    expect(formatValue(1.5, { unit: 'Hz' })).toBe('1.5 Hz')
    expect(formatValue(0.25, { unit: 'Hz' })).toBe('0.25 Hz')
    expect(formatValue(4000, { unit: 'kHz' })).toBe('4.0 kHz')
    expect(formatValue(3, { unit: 'oct' })).toBe('3.0 oct')
    expect(formatValue(7, { unit: 'st' })).toBe('+7')
    expect(formatValue(0, { unit: 'pan' })).toBe('M')
    expect(formatValue(-0.5, { unit: 'pan' })).toBe('L50')
    expect(formatValue(1, { unit: 'pan' })).toBe('R100')
    expect(formatValue(79.6, { unit: 'vol' })).toBe('80')
  })
})
