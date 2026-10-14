import { describe, expect, test } from 'bun:test'

import {
  delayGains,
  distortionAmount,
  reverbRoomSize,
  tailSeconds
} from './mapping.js'

describe('перевод параметров', () => {
  test('Decay 0–1 → roomSize 0–0.9', () => {
    expect(reverbRoomSize(0)).toBe(0)
    expect(reverbRoomSize(0.5)).toBeCloseTo(0.45)
    expect(reverbRoomSize(1)).toBeCloseTo(0.9)
  })

  test('Drive 0–1 → distortion 0–0.5', () => {
    expect(distortionAmount(0)).toBe(0)
    expect(distortionAmount(1)).toBe(0.5)
  })
})

describe('Delay L/R', () => {
  test('Ping-Pong: вход слева, эхо перекрёстно', () => {
    expect(delayGains(0.35, true)).toEqual({
      inL: 1,
      inR: 0,
      LL: 0,
      RR: 0,
      LR: 0.35,
      RL: 0.35
    })
  })

  test('без Ping-Pong: обе линии повторяют сами себя', () => {
    expect(delayGains(0.5, false)).toEqual({
      inL: 1,
      inR: 1,
      LL: 0.5,
      RR: 0.5,
      LR: 0,
      RL: 0
    })
  })

  test('обратная связь не больше 85% — эхо затухает', () => {
    const gains = delayGains(0.85, true)
    expect(Math.max(gains.LL, gains.RR, gains.LR, gains.RL)).toBeLessThan(1)
  })
})

describe('хвост после отключения', () => {
  test('дилей ждёт дольше при большой обратной связи', () => {
    const short = tailSeconds('delay', { feedback: 0.1 })
    const long = tailSeconds('delay', { feedback: 0.85 })
    expect(long).toBeGreaterThan(short)
    expect(long).toBeLessThanOrEqual(12)
  })

  test('реверберация зависит от Decay, остальные — коротко', () => {
    expect(tailSeconds('reverb', { decay: 1 })).toBe(4)
    expect(tailSeconds('chorus', {})).toBe(0.5)
  })
})
