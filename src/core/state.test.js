import { describe, expect, test } from 'bun:test'

import {
  MAX_NODES,
  canAddNodes,
  columnHeight,
  createInitialState,
  isLinked,
  nextColumnIndex,
  nodeCount,
  nodesOfVoice,
  reducer,
  voicesOfNode
} from './state.js'
import { EFFECT_TYPES, defaultSettings } from './effects.js'

// Применяет несколько действий подряд
function run(state, ...actions) {
  return actions.reduce((s, a) => reducer(s, a), state)
}

// Глубокая заморозка: если редьюсер попытается изменить старое состояние, тест упадёт
function deepFreeze(obj) {
  Object.values(obj).forEach((v) => {
    if (v && typeof v === 'object') deepFreeze(v)
  })
  return Object.freeze(obj)
}

function fresh() {
  return deepFreeze(createInitialState())
}

describe('Стартовое состояние (макет Starter)', () => {
  test('три голоса с инструментами и панорамой по умолчанию', () => {
    const { voices } = fresh()
    expect(voices.lead).toEqual({ instrument: 'whirly', volume: 80, pan: -0.5 })
    expect(voices.bass).toEqual({
      instrument: 'church-organ',
      volume: 80,
      pan: 0
    })
    expect(voices.extra).toEqual({
      instrument: 'fm-keys',
      volume: 80,
      pan: 0.5
    })
  })

  test('четыре ноды в четырёх колонках: Vibrato, Delay, Reverb, Reverb', () => {
    const s = fresh()
    expect(s.layout.columns).toEqual([['n1'], ['n2'], ['n3'], ['n4']])
    expect(s.layout.columns.flat().map((id) => s.nodes[id].type)).toEqual([
      'vibrato',
      'delay',
      'reverb',
      'reverb'
    ])
  })

  test('связи как в макете', () => {
    const s = fresh()
    expect(voicesOfNode(s, 'n1')).toEqual(['lead', 'bass', 'extra'])
    expect(voicesOfNode(s, 'n2')).toEqual(['lead', 'extra'])
    expect(voicesOfNode(s, 'n3')).toEqual(['bass'])
    expect(voicesOfNode(s, 'n4')).toEqual(['extra'])
  })

  test('Delay: Time L = 1/4, Time R = 1/8, PingPong включён', () => {
    const { settings } = fresh().nodes.n2
    expect(settings.timeL).toBe('4n')
    expect(settings.timeR).toBe('8n')
    expect(settings.pingPong).toBe(true)
  })

  test('панель раскрыта, ни один голос не открыт', () => {
    const s = fresh()
    expect(s.layout.panelOpen).toBe(true)
    expect(s.ui.openVoice).toBe(null)
  })

  test('карточка Add Effect стоит в первой колонке', () => {
    expect(nextColumnIndex(fresh())).toBe(0)
  })
})

describe('Добавление нод', () => {
  test('новая нода получает параметры по умолчанию и не подключена', () => {
    const s = run(fresh(), { type: 'ADD_NODES', types: ['chorus'] })
    const node = s.nodes.n5
    expect(node.type).toBe('chorus')
    expect(node.settings).toEqual(defaultSettings('chorus'))
    expect(voicesOfNode(s, 'n5')).toEqual([])
  })

  test('мультиселект: ноды раскладываются по колонкам по кругу', () => {
    const s = run(fresh(), {
      type: 'ADD_NODES',
      types: ['chorus', 'phaser', 'distortion']
    })
    expect(s.layout.columns).toEqual([
      ['n1', 'n5'],
      ['n2', 'n6'],
      ['n3', 'n7'],
      ['n4']
    ])
    expect(nextColumnIndex(s)).toBe(3)
  })

  test('один тип можно добавить несколько раз', () => {
    const s = run(
      fresh(),
      { type: 'ADD_NODES', types: ['reverb'] },
      { type: 'ADD_NODES', types: ['reverb'] }
    )
    const reverbs = Object.values(s.nodes).filter((n) => n.type === 'reverb')
    expect(reverbs.length).toBe(4)
  })

  test('не больше 12 нод: лишние из выбора не добавляются', () => {
    const many = Array(20).fill('vibrato')
    const s = run(fresh(), { type: 'ADD_NODES', types: many })
    expect(nodeCount(s)).toBe(MAX_NODES)
    expect(canAddNodes(s)).toBe(false)

    const after = reducer(s, { type: 'ADD_NODES', types: ['reverb'] })
    expect(after).toBe(s)
  })

  test('неизвестный тип эффекта игнорируется', () => {
    const s = fresh()
    expect(reducer(s, { type: 'ADD_NODES', types: ['bitcrusher'] })).toBe(s)
  })

  test('все 7 типов эффектов можно добавить', () => {
    const s = run(fresh(), { type: 'ADD_NODES', types: EFFECT_TYPES })
    expect(nodeCount(s)).toBe(11)
  })
})

describe('Слоты снежинки', () => {
  test('нода получает наименьший свободный слот своей зоны', () => {
    // В зоне center уже заняты слоты 0 (delay), 1 и 2 (reverb)
    const s = run(fresh(), {
      type: 'ADD_NODES',
      types: ['pitchShift', 'chorus']
    })
    expect(s.nodes.n5.slot).toBe(3) // center
    expect(s.nodes.n6.slot).toBe(0) // edge, первая
  })

  test('перестановка нод не меняет слоты', () => {
    const before = fresh()
    const after = run(before, {
      type: 'MOVE_NODE',
      nodeId: 'n4',
      toColumn: 0,
      toIndex: 0
    })
    Object.keys(before.nodes).forEach((id) => {
      expect(after.nodes[id].slot).toBe(before.nodes[id].slot)
    })
  })
})

describe('Перетаскивание нод', () => {
  test('в другую колонку, над нодой', () => {
    const s = run(fresh(), {
      type: 'MOVE_NODE',
      nodeId: 'n4',
      toColumn: 0,
      toIndex: 0
    })
    expect(s.layout.columns).toEqual([['n4', 'n1'], ['n2'], ['n3'], []])
  })

  test('в другую колонку, под нодой', () => {
    const s = run(fresh(), {
      type: 'MOVE_NODE',
      nodeId: 'n4',
      toColumn: 0,
      toIndex: 1
    })
    expect(s.layout.columns).toEqual([['n1', 'n4'], ['n2'], ['n3'], []])
  })

  test('внутри колонки', () => {
    const s = run(
      fresh(),
      { type: 'MOVE_NODE', nodeId: 'n4', toColumn: 0, toIndex: 1 },
      { type: 'MOVE_NODE', nodeId: 'n4', toColumn: 0, toIndex: 0 }
    )
    expect(s.layout.columns[0]).toEqual(['n4', 'n1'])
  })

  test('индекс за пределами колонки — нода встаёт в конец', () => {
    const s = run(fresh(), {
      type: 'MOVE_NODE',
      nodeId: 'n3',
      toColumn: 1,
      toIndex: 99
    })
    expect(s.layout.columns[1]).toEqual(['n2', 'n3'])
  })

  test('перестановка не меняет связи и параметры', () => {
    const before = fresh()
    const after = run(before, {
      type: 'MOVE_NODE',
      nodeId: 'n2',
      toColumn: 3,
      toIndex: 0
    })
    expect(after.links).toBe(before.links)
    expect(after.nodes).toBe(before.nodes)
  })

  test('несуществующая колонка — ничего не меняется', () => {
    const s = fresh()
    expect(
      reducer(s, { type: 'MOVE_NODE', nodeId: 'n1', toColumn: 7, toIndex: 0 })
    ).toBe(s)
  })
})

describe('Связи голос → нода', () => {
  test('подключение', () => {
    const s = run(fresh(), { type: 'LINK', voice: 'bass', nodeId: 'n2' })
    expect(isLinked(s, 'bass', 'n2')).toBe(true)
    expect(voicesOfNode(s, 'n2')).toEqual(['lead', 'bass', 'extra'])
  })

  test('повторное подключение ничего не меняет', () => {
    const s = fresh()
    expect(reducer(s, { type: 'LINK', voice: 'lead', nodeId: 'n1' })).toBe(s)
  })

  test('отключение (Dot / Delete Link)', () => {
    const s = run(fresh(), { type: 'UNLINK', voice: 'lead', nodeId: 'n1' })
    expect(isLinked(s, 'lead', 'n1')).toBe(false)
    expect(voicesOfNode(s, 'n1')).toEqual(['bass', 'extra'])
  })

  test('отключение несуществующей связи ничего не меняет', () => {
    const s = fresh()
    expect(reducer(s, { type: 'UNLINK', voice: 'bass', nodeId: 'n2' })).toBe(s)
  })

  test('лампочки идут в порядке lead → bass → extra независимо от порядка подключения', () => {
    const s = run(
      fresh(),
      { type: 'ADD_NODES', types: ['chorus'] },
      { type: 'LINK', voice: 'extra', nodeId: 'n5' },
      { type: 'LINK', voice: 'lead', nodeId: 'n5' }
    )
    expect(voicesOfNode(s, 'n5')).toEqual(['lead', 'extra'])
  })

  test('ноды голоса для режима связей', () => {
    expect(nodesOfVoice(fresh(), 'extra')).toEqual(['n1', 'n2', 'n4'])
  })

  test('неизвестный голос или нода игнорируются', () => {
    const s = fresh()
    expect(reducer(s, { type: 'LINK', voice: 'drums', nodeId: 'n1' })).toBe(s)
    expect(reducer(s, { type: 'LINK', voice: 'lead', nodeId: 'n99' })).toBe(s)
  })
})

describe('Параметры эффектов', () => {
  test('изменение параметра', () => {
    const s = run(fresh(), {
      type: 'SET_PARAM',
      nodeId: 'n3',
      param: 'decay',
      value: 0.8
    })
    expect(s.nodes.n3.settings.decay).toBe(0.8)
  })

  test('значение за пределами диапазона прижимается к границе', () => {
    const s = run(
      fresh(),
      { type: 'SET_PARAM', nodeId: 'n2', param: 'feedback', value: 2 },
      { type: 'SET_PARAM', nodeId: 'n3', param: 'decay', value: -1 }
    )
    expect(s.nodes.n2.settings.feedback).toBe(0.85)
    expect(s.nodes.n3.settings.decay).toBe(0)
  })

  test('дробные значения сохраняются как есть', () => {
    const s = run(fresh(), {
      type: 'SET_PARAM',
      nodeId: 'n1',
      param: 'rate',
      value: 2.37
    })
    expect(s.nodes.n1.settings.rate).toBe(2.37)
  })

  test('steps: допустимое значение принимается, недопустимое — нет', () => {
    const s = fresh()
    const ok = reducer(s, {
      type: 'SET_PARAM',
      nodeId: 'n2',
      param: 'timeL',
      value: '2n'
    })
    expect(ok.nodes.n2.settings.timeL).toBe('2n')

    const bad = reducer(s, {
      type: 'SET_PARAM',
      nodeId: 'n2',
      param: 'timeL',
      value: '16n'
    })
    expect(bad).toBe(s)
  })

  test('PingPong: только да / нет', () => {
    const s = fresh()
    const off = reducer(s, {
      type: 'SET_PARAM',
      nodeId: 'n2',
      param: 'pingPong',
      value: false
    })
    expect(off.nodes.n2.settings.pingPong).toBe(false)
    expect(
      reducer(s, {
        type: 'SET_PARAM',
        nodeId: 'n2',
        param: 'pingPong',
        value: 'no'
      })
    ).toBe(s)
  })

  test('чужой параметр игнорируется (у Reverb нет Feedback)', () => {
    const s = fresh()
    expect(
      reducer(s, {
        type: 'SET_PARAM',
        nodeId: 'n3',
        param: 'feedback',
        value: 0.5
      })
    ).toBe(s)
  })

  test('то же значение — состояние не пересоздаётся', () => {
    const s = fresh()
    expect(
      reducer(s, { type: 'SET_PARAM', nodeId: 'n3', param: 'mix', value: 0.4 })
    ).toBe(s)
  })

  test('изменение одной ноды не трогает другие', () => {
    const before = fresh()
    const after = run(before, {
      type: 'SET_PARAM',
      nodeId: 'n3',
      param: 'decay',
      value: 0.1
    })
    expect(after.nodes.n4).toBe(before.nodes.n4)
    expect(after.nodes.n4.settings.decay).toBe(0.5)
  })
})

describe('Настройки голоса', () => {
  test('громкость 0–100 с прижатием к границам', () => {
    const s = run(
      fresh(),
      { type: 'SET_VOICE', voice: 'lead', key: 'volume', value: 150 },
      { type: 'SET_VOICE', voice: 'bass', key: 'volume', value: -5 }
    )
    expect(s.voices.lead.volume).toBe(100)
    expect(s.voices.bass.volume).toBe(0)
  })

  test('панорама −1…+1, плавная', () => {
    const s = run(
      fresh(),
      { type: 'SET_VOICE', voice: 'lead', key: 'pan', value: 0.12 },
      { type: 'SET_VOICE', voice: 'bass', key: 'pan', value: -3 }
    )
    expect(s.voices.lead.pan).toBe(0.12)
    expect(s.voices.bass.pan).toBe(-1)
  })

  test('инструмент — только из списка этого голоса', () => {
    const s = fresh()
    const ok = reducer(s, {
      type: 'SET_VOICE',
      voice: 'lead',
      key: 'instrument',
      value: 'celesta'
    })
    expect(ok.voices.lead.instrument).toBe('celesta')

    const foreign = reducer(s, {
      type: 'SET_VOICE',
      voice: 'lead',
      key: 'instrument',
      value: 'church-organ'
    })
    expect(foreign).toBe(s)
  })
})

describe('Контракт handleChange(property, value)', () => {
  test('путь к параметру ноды', () => {
    const s = run(fresh(), {
      type: 'CHANGE',
      property: ['nodes', 'n1', 'settings', 'depth'],
      value: 0.7
    })
    expect(s.nodes.n1.settings.depth).toBe(0.7)
  })

  test('путь к настройке голоса', () => {
    const s = run(fresh(), {
      type: 'CHANGE',
      property: ['voices', 'extra', 'volume'],
      value: 42
    })
    expect(s.voices.extra.volume).toBe(42)
  })

  test('неизвестный путь игнорируется', () => {
    const s = fresh()
    expect(
      reducer(s, { type: 'CHANGE', property: ['layout', 'cursor'], value: 0 })
    ).toBe(s)
    expect(
      reducer(s, { type: 'CHANGE', property: 'voices.lead.volume', value: 1 })
    ).toBe(s)
  })
})

describe('Панель снежинки: 4 ↔ 5 колонок', () => {
  test('сворачивание добавляет пустую пятую колонку, ноды остаются на местах', () => {
    const s = run(fresh(), { type: 'SET_PANEL', open: false })
    expect(s.layout.panelOpen).toBe(false)
    expect(s.layout.columns).toEqual([['n1'], ['n2'], ['n3'], ['n4'], []])
  })

  test('в свёрнутом виде Add Effect стоит в пятой колонке (как Starter Expanded)', () => {
    const s = run(fresh(), { type: 'SET_PANEL', open: false })
    expect(nextColumnIndex(s)).toBe(4)
  })

  test('разворачивание без нод в пятой колонке возвращает раскладку как была', () => {
    const s = run(
      fresh(),
      { type: 'SET_PANEL', open: false },
      { type: 'SET_PANEL', open: true }
    )
    expect(s.layout.columns).toEqual([['n1'], ['n2'], ['n3'], ['n4']])
  })

  test('ноды из пятой колонки уходят в конец самых коротких колонок', () => {
    // Высоты: vibrato 168, delay 269, reverb 112, reverb 112
    const s = run(
      fresh(),
      { type: 'SET_PANEL', open: false },
      { type: 'ADD_NODES', types: ['chorus', 'phaser'] }, // обе в колонки 5 и 1
      { type: 'MOVE_NODE', nodeId: 'n6', toColumn: 4, toIndex: 1 },
      { type: 'SET_PANEL', open: true }
    )
    // n5 (chorus) — в самую короткую: колонку 3 (reverb, 112, левее колонки 4)
    // n6 (phaser) — затем в колонку 4 (reverb, 112)
    expect(s.layout.columns).toEqual([
      ['n1'],
      ['n2'],
      ['n3', 'n5'],
      ['n4', 'n6']
    ])
  })

  test('высота колонки считается с отступами 16 px', () => {
    const s = fresh()
    expect(columnHeight(s, ['n1', 'n3'])).toBe(168 + 16 + 112)
  })

  test('повторная команда в то же состояние ничего не меняет', () => {
    const s = fresh()
    expect(reducer(s, { type: 'SET_PANEL', open: true })).toBe(s)
  })
})

describe('Открытая плашка голоса', () => {
  test('одновременно открыта только одна', () => {
    const s = run(
      fresh(),
      { type: 'OPEN_VOICE', voice: 'lead' },
      { type: 'OPEN_VOICE', voice: 'bass' }
    )
    expect(s.ui.openVoice).toBe('bass')
  })

  test('закрытие', () => {
    const s = run(
      fresh(),
      { type: 'OPEN_VOICE', voice: 'lead' },
      { type: 'OPEN_VOICE', voice: null }
    )
    expect(s.ui.openVoice).toBe(null)
  })
})

describe('Общие правила', () => {
  test('неизвестное действие возвращает то же состояние', () => {
    const s = fresh()
    expect(reducer(s, { type: 'DELETE_EVERYTHING' })).toBe(s)
  })

  test('редьюсер не изменяет старое состояние (оно заморожено)', () => {
    expect(() =>
      run(
        fresh(),
        { type: 'ADD_NODES', types: ['chorus', 'phaser'] },
        { type: 'MOVE_NODE', nodeId: 'n5', toColumn: 2, toIndex: 0 },
        { type: 'LINK', voice: 'bass', nodeId: 'n5' },
        { type: 'UNLINK', voice: 'lead', nodeId: 'n1' },
        { type: 'SET_PARAM', nodeId: 'n5', param: 'rate', value: 3 },
        { type: 'SET_VOICE', voice: 'lead', key: 'volume', value: 10 },
        { type: 'SET_PANEL', open: false },
        { type: 'SET_PANEL', open: true },
        { type: 'OPEN_VOICE', voice: 'extra' }
      )
    ).not.toThrow()
  })
})

describe('режим редактирования', () => {
  test('Edit включается и выключается, при выходе выбор сбрасывается', () => {
    let s = run(
      createInitialState(),
      { type: 'SET_EDITING', on: true },
      { type: 'TOGGLE_SELECTED', nodeId: 'n2' }
    )
    expect(s.ui.editing).toBe(true)
    expect(s.ui.selected).toEqual(['n2'])

    s = reducer(s, { type: 'SET_EDITING', on: false })
    expect(s.ui.editing).toBe(false)
    expect(s.ui.selected).toEqual([])
  })

  test('выбирать можно только в режиме Edit, повторный клик снимает выбор', () => {
    const init = createInitialState()
    expect(reducer(init, { type: 'TOGGLE_SELECTED', nodeId: 'n1' })).toBe(init)

    const s = run(
      init,
      { type: 'SET_EDITING', on: true },
      { type: 'TOGGLE_SELECTED', nodeId: 'n1' },
      { type: 'TOGGLE_SELECTED', nodeId: 'n3' },
      { type: 'TOGGLE_SELECTED', nodeId: 'n1' },
      { type: 'TOGGLE_SELECTED', nodeId: 'nope' }
    )
    expect(s.ui.selected).toEqual(['n3'])
  })

  test('Delete удаляет выбранные ноды вместе со связями и местами в колонках', () => {
    const s = run(
      createInitialState(),
      { type: 'SET_EDITING', on: true },
      { type: 'TOGGLE_SELECTED', nodeId: 'n1' },
      { type: 'TOGGLE_SELECTED', nodeId: 'n3' },
      { type: 'DELETE_SELECTED' }
    )
    expect(Object.keys(s.nodes)).toEqual(['n2', 'n4'])
    expect(s.links.some((l) => l.node === 'n1' || l.node === 'n3')).toBe(false)
    expect(s.layout.columns.flat()).toEqual(['n2', 'n4'])
    expect(s.ui.selected).toEqual([])
    expect(s.ui.editing).toBe(true)
  })

  test('Delete без выбора ничего не меняет', () => {
    const s = reducer(createInitialState(), { type: 'SET_EDITING', on: true })
    expect(reducer(s, { type: 'DELETE_SELECTED' })).toBe(s)
  })

  test('Reset All: ни одного эффекта, голоса не тронуты, новые ноды — с первой колонки', () => {
    const init = run(createInitialState(), {
      type: 'CHANGE',
      property: ['voices', 'lead', 'volume'],
      value: 40
    })
    let s = reducer(init, { type: 'RESET_NODES' })
    expect(nodeCount(s)).toBe(0)
    expect(s.links).toEqual([])
    expect(s.layout.columns.flat()).toEqual([])
    expect(s.voices).toEqual(init.voices)
    expect(nextColumnIndex(s)).toBe(0)

    s = reducer(s, { type: 'ADD_NODES', types: ['chorus'] })
    expect(s.layout.columns[0]).toHaveLength(1)
    // id не повторяются: сид узора у новой ноды свой
    expect(Object.keys(s.nodes)[0]).toBe('n5')
  })
})
