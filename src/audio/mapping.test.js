import { describe, expect, test } from 'bun:test'

import {
  delayGains,
  distortionAmount,
  reverbRoomSize,
  sendGain,
  tailSeconds
} from './mapping.js'

describe('перевод параметров', () => {
  test('Decay 0–1 → roomSize 0.2–0.93, не до бесконечного хвоста', () => {
    expect(reverbRoomSize(0)).toBeCloseTo(0.2)
    expect(reverbRoomSize(1)).toBeCloseTo(0.93)
    expect(reverbRoomSize(1)).toBeLessThan(0.95)
  })

  test('Drive 0–1 → distortion 0.05–0.8', () => {
    expect(distortionAmount(0)).toBeCloseTo(0.05)
    expect(distortionAmount(1)).toBeCloseTo(0.8)
  })

  test('Mix 0 — посыла нет, Mix растёт — посыл растёт', () => {
    expect(sendGain(0)).toBe(0)
    expect(sendGain(1)).toBeGreaterThan(sendGain(0.4))
  })
})

describe('Delay L/R', () => {
  test('Ping-Pong: вход слева, эхо перекрёстно, линии по своим ушам', () => {
    const g = delayGains(0.35, true)
    expect([g.inL, g.inR]).toEqual([1, 0])
    expect([g.LL, g.RR, g.LR, g.RL]).toEqual([0, 0, 0.35, 0.35])
    expect([g.outLL, g.outLR, g.outRL, g.outRR]).toEqual([1, 0, 0, 1])
  })

  test('без Ping-Pong: линии повторяют сами себя, эхо в обоих ушах', () => {
    const g = delayGains(0.5, false)
    expect([g.inL, g.inR]).toEqual([1, 1])
    expect([g.LL, g.RR, g.LR, g.RL]).toEqual([0.5, 0.5, 0, 0])
    expect(g.outLL).toBeCloseTo(g.outLR)
    expect(g.outRL).toBeCloseTo(g.outRR)
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
