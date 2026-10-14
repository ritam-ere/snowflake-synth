import { describe, expect, test } from 'bun:test'

import {
  APEX,
  EDGE_DEPTH,
  FOLD_DEPTH,
  L,
  SLOT_GEOMETRY,
  SPINE,
  WIDTH,
  distanceToFold,
  inCenter,
  inWedge,
  seedOf,
  snowflakePattern,
  unfoldSector,
  unfoldTransforms
} from './snowflake.js'
import { createInitialState, reducer } from './state.js'

const apply = (state, ...actions) => actions.reduce(reducer, state)

describe('клин и зоны', () => {
  test('сектор 30°: ширина у края = L·tan30°', () => {
    expect(WIDTH).toBeCloseTo(L * Math.tan(Math.PI / 6))
    expect(inWedge(0, L)).toBe(true)
    expect(inWedge(WIDTH + 1, L)).toBe(false)
  })

  test('расстояние до левого сгиба: на сгибе 0, на хребте максимально', () => {
    expect(distanceToFold(L * Math.tan(Math.PI / 6), L)).toBeCloseTo(0)
    expect(distanceToFold(0, 100)).toBeGreaterThan(distanceToFold(20, 100))
  })

  test('середина не касается хребта, вершины, сгиба и края', () => {
    expect(inCenter(SPINE, 200)).toBe(false)
    expect(inCenter(60, APEX)).toBe(false)
    expect(inCenter(60, L - EDGE_DEPTH)).toBe(false)
    expect(inCenter(60, 200)).toBe(true)
  })
})

describe('слоты', () => {
  test('по 12 слотов в каждой зоне', () => {
    expect(SLOT_GEOMETRY.center.length).toBe(12)
    expect(SLOT_GEOMETRY.edge.length).toBe(12)
    expect(SLOT_GEOMETRY.folds.length).toBe(12)
  })

  test('отверстия середины целиком в зоне и не перекрываются', () => {
    const slots = SLOT_GEOMETRY.center
    slots.forEach((s) => expect(inCenter(s.x, s.y, s.radius)).toBe(true))
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const d = Math.hypot(slots[i].x - slots[j].x, slots[i].y - slots[j].y)
        expect(d).toBeGreaterThanOrEqual(slots[i].radius + slots[j].radius)
      }
    }
  })

  test('вырезы края не заходят на хребет и левый сгиб', () => {
    SLOT_GEOMETRY.edge.forEach((s) => {
      expect(s.from).toBeGreaterThan(SPINE)
      expect(s.to).toBeLessThan(WIDTH - FOLD_DEPTH)
    })
  })

  test('выемки сгиба не доходят до вершины и до зоны края', () => {
    const cos30 = Math.cos(Math.PI / 6)
    SLOT_GEOMETRY.folds.forEach((s) => {
      expect(s.from * cos30).toBeGreaterThan(APEX)
      expect(s.to * cos30).toBeLessThan(L - EDGE_DEPTH)
    })
  })
})

describe('узор', () => {
  test('стартовое состояние: 4 ноды режут, все в середине', () => {
    const cuts = snowflakePattern(createInitialState())
    expect(cuts.map((c) => c.nodeId)).toEqual(['n1', 'n2', 'n3', 'n4'])
    expect(cuts.map((c) => c.zone)).toEqual([
      'folds',
      'center',
      'center',
      'center'
    ])
  })

  test('одинаковое состояние — одинаковый узор', () => {
    expect(snowflakePattern(createInitialState())).toEqual(
      snowflakePattern(createInitialState())
    )
  })

  test('перестановка нод на поле узор не меняет', () => {
    const before = createInitialState()
    const after = apply(before, {
      type: 'MOVE_NODE',
      nodeId: 'n4',
      toColumn: 0,
      toIndex: 0
    })
    expect(snowflakePattern(after)).toEqual(snowflakePattern(before))
  })

  test('нода без голосов и нода с Mix 0 не режут', () => {
    let state = apply(createInitialState(), {
      type: 'ADD_NODES',
      types: ['chorus']
    })
    expect(snowflakePattern(state).some((c) => c.nodeId === 'n5')).toBe(false)

    state = apply(
      state,
      { type: 'LINK', voice: 'lead', nodeId: 'n5' },
      { type: 'CHANGE', property: ['nodes', 'n3', 'settings', 'mix'], value: 0 }
    )
    const ids = snowflakePattern(state).map((c) => c.nodeId)
    expect(ids).toContain('n5')
    expect(ids).not.toContain('n3')
  })

  test('нет подключённых нод — целый клин', () => {
    const state = { ...createInitialState(), links: [] }
    expect(snowflakePattern(state)).toEqual([])
  })

  test('сид постоянный для id и разный для разных нод', () => {
    expect(seedOf('n1')).toBe(seedOf('n1'))
    expect(seedOf('n1')).not.toBe(seedOf('n2'))
    expect(seedOf('n7')).toBeGreaterThanOrEqual(0)
    expect(seedOf('n7')).toBeLessThan(1)
  })
})

describe('разворот', () => {
  test('12 копий покрывают круг без пропусков и наложений', () => {
    const sectors = Array.from({ length: 12 }, (_, k) => unfoldSector(k))
      .map(([a, b]) => [((a % 360) + 360) % 360, b])
      .sort((p, q) => p[0] - q[0])
    sectors.forEach(([a, b], i) => {
      expect(b - a === 30 || b - a === -330).toBe(true)
      if (i > 0) expect(a).toBe((sectors[i - 1][0] + 30) % 360)
    })
    expect(unfoldTransforms().length).toBe(12)
  })

  test('каждая вторая копия отражена', () => {
    const t = unfoldTransforms()
    expect(t.filter((s) => s.includes('scale(-1 1)')).length).toBe(6)
    expect(t[0]).toBe('rotate(0)')
  })
})
