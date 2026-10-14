import { describe, expect, test } from 'bun:test'

import { createInitialState, reducer } from '../core/state.js'
import { EMPTY_GRAPH, desiredGraph, diffGraph } from './graph.js'

const sorted = (iterable) => [...iterable].sort()

function apply(state, ...actions) {
  return actions.reduce((s, action) => reducer(s, action), state)
}

function diffOf(before, after) {
  return diffGraph(desiredGraph(before), desiredGraph(after))
}

const NOTHING = {
  addInstances: [],
  updateInstances: [],
  removeInstances: [],
  addTaps: [],
  removeTaps: []
}

describe('желаемый граф', () => {
  test('стартовое состояние как в макете: 4 эффекта, 7 посылов', () => {
    const { instances, taps } = desiredGraph(createInitialState())

    expect(sorted(instances.keys())).toEqual(['n1', 'n2', 'n3', 'n4'])
    expect(instances.get('n1').type).toBe('vibrato')
    expect(instances.get('n2').type).toBe('delay')
    expect(instances.get('n3').type).toBe('reverb')
    expect(instances.get('n4').type).toBe('reverb')

    expect(sorted(taps.keys())).toEqual([
      'n1:bass',
      'n1:extra',
      'n1:lead',
      'n2:extra',
      'n2:lead',
      'n3:bass',
      'n4:extra'
    ])
    expect(taps.get('n2:extra')).toEqual({ voice: 'extra', instance: 'n2' })
  })

  test('Distortion — свой экземпляр на каждый голос', () => {
    let state = apply(createInitialState(), {
      type: 'ADD_NODES',
      types: ['distortion']
    })
    state = apply(
      state,
      { type: 'LINK', voice: 'lead', nodeId: 'n5' },
      { type: 'LINK', voice: 'bass', nodeId: 'n5' }
    )
    const { instances, taps } = desiredGraph(state)

    expect(instances.has('n5:lead')).toBe(true)
    expect(instances.has('n5:bass')).toBe(true)
    expect(instances.has('n5')).toBe(false)
    expect(taps.get('n5:bass').instance).toBe('n5:bass')
  })

  test('связь с несуществующей нодой пропускается', () => {
    const state = createInitialState()
    const broken = { ...state, links: [{ voice: 'lead', node: 'n99' }] }
    const { instances, taps } = desiredGraph(broken)

    expect(instances.size).toBe(0)
    expect(taps.size).toBe(0)
  })

  test('новая нода без связей не звучит', () => {
    const state = apply(createInitialState(), {
      type: 'ADD_NODES',
      types: ['chorus']
    })
    expect(desiredGraph(state).instances.has('n5')).toBe(false)
  })
})

describe('разница графов', () => {
  test('из пустого — всё создать', () => {
    const diff = diffGraph(EMPTY_GRAPH, desiredGraph(createInitialState()))

    expect(diff.addInstances.length).toBe(4)
    expect(diff.addTaps.length).toBe(7)
    expect(diff.removeInstances).toEqual([])
    expect(diff.removeTaps).toEqual([])
  })

  test('без изменений — ничего не делать', () => {
    const state = createInitialState()
    expect(diffOf(state, state)).toEqual(NOTHING)
  })

  test('голос подключили к существующей ноде — только новый посыл', () => {
    const before = createInitialState()
    const after = apply(before, { type: 'LINK', voice: 'lead', nodeId: 'n3' })

    expect(diffOf(before, after)).toEqual({ ...NOTHING, addTaps: ['n3:lead'] })
  })

  test('отключили один из голосов — эффект остаётся для остальных', () => {
    const before = createInitialState()
    const after = apply(before, {
      type: 'UNLINK',
      voice: 'extra',
      nodeId: 'n2'
    })

    expect(diffOf(before, after)).toEqual({
      ...NOTHING,
      removeTaps: ['n2:extra']
    })
  })

  test('отключили последний голос — эффект удаляется', () => {
    const before = createInitialState()
    const after = apply(before, { type: 'UNLINK', voice: 'bass', nodeId: 'n3' })

    expect(diffOf(before, after)).toEqual({
      ...NOTHING,
      removeTaps: ['n3:bass'],
      removeInstances: ['n3']
    })
  })

  test('параметр ноды — обновить её эффект, посылы не трогать', () => {
    const before = createInitialState()
    const after = apply(before, {
      type: 'CHANGE',
      property: ['nodes', 'n1', 'settings', 'depth'],
      value: 0.8
    })

    expect(diffOf(before, after)).toEqual({
      ...NOTHING,
      updateInstances: ['n1']
    })
  })

  test('перестановка нод в колонках звук не меняет', () => {
    const before = createInitialState()
    const after = apply(before, {
      type: 'MOVE_NODE',
      nodeId: 'n4',
      toColumn: 0,
      toIndex: 0
    })

    expect(diffOf(before, after)).toEqual(NOTHING)
  })

  test('максимум: 12 нод × 3 голоса — 36 посылов, эффектов не больше 12 + перегрузы', () => {
    let state = apply(createInitialState(), {
      type: 'ADD_NODES',
      types: [
        'chorus',
        'distortion',
        'phaser',
        'pitchShift',
        'delay',
        'vibrato',
        'reverb',
        'chorus'
      ]
    })
    Object.keys(state.nodes).forEach((nodeId) => {
      ;['lead', 'bass', 'extra'].forEach((voice) => {
        state = reducer(state, { type: 'LINK', voice, nodeId })
      })
    })
    const { instances, taps } = desiredGraph(state)

    expect(taps.size).toBe(36)
    // 11 общих эффектов + Distortion на каждый из 3 голосов
    expect(instances.size).toBe(14)
  })
})
