// Ядро: состояние проекта и все действия над ним (разделы 3, 7, 8 ТЗ).
// Чистые функции: состояние не изменяется, каждое действие возвращает новое.
// Ни React, ни Tone.js здесь не используются.

import {
  EFFECTS,
  EFFECT_TYPES,
  defaultSettings,
  normalizeParam
} from './effects.js'
import { VOICES, VOICE_IDS, normalizeVoiceSetting } from './voices.js'

export const MAX_NODES = 12
export const COLUMNS_PANEL_OPEN = 4
export const COLUMNS_PANEL_CLOSED = 5
export const COLUMN_GAP = 16

// ---------- Создание ----------

function createNode(id, type, slot) {
  return { id, type, slot, settings: defaultSettings(type) }
}

// Стартовое состояние — как в макете Starter:
// Vibrato → все голоса, Delay → lead + extra, Reverb → bass, Reverb → extra
export function createInitialState() {
  const voices = {}

  VOICE_IDS.forEach((id) => {
    voices[id] = { ...VOICES[id].defaults }
  })

  return {
    voices,
    nodes: {
      n1: createNode('n1', 'vibrato', 0),
      n2: createNode('n2', 'delay', 0),
      n3: createNode('n3', 'reverb', 1),
      n4: createNode('n4', 'reverb', 2)
    },
    links: [
      { voice: 'lead', node: 'n1' },
      { voice: 'bass', node: 'n1' },
      { voice: 'extra', node: 'n1' },
      { voice: 'lead', node: 'n2' },
      { voice: 'extra', node: 'n2' },
      { voice: 'bass', node: 'n3' },
      { voice: 'extra', node: 'n4' }
    ],
    layout: {
      panelOpen: true,
      columns: [['n1'], ['n2'], ['n3'], ['n4']],
      // Счётчик для раскладки новых нод по колонкам по кругу
      cursor: 4
    },
    ui: { openVoice: null },
    nextId: 5
  }
}

// ---------- Селекторы ----------

export function nodeCount(state) {
  return Object.keys(state.nodes).length
}

export function canAddNodes(state) {
  return nodeCount(state) < MAX_NODES
}

export function isLinked(state, voice, nodeId) {
  return state.links.some((l) => l.voice === voice && l.node === nodeId)
}

// Голоса, подключённые к ноде, в постоянном порядке lead → bass → extra
export function voicesOfNode(state, nodeId) {
  return VOICE_IDS.filter((voice) => isLinked(state, voice, nodeId))
}

export function nodesOfVoice(state, voice) {
  return state.links.filter((l) => l.voice === voice).map((l) => l.node)
}

// Колонка, в которую попадёт следующая новая нода
export function nextColumnIndex(state) {
  return state.layout.cursor % state.layout.columns.length
}

// Высота колонки по высотам нод из макета и отступам между ними
export function columnHeight(state, column) {
  const heights = column.map((id) => EFFECTS[state.nodes[id].type].height)
  const gaps = Math.max(0, column.length - 1) * COLUMN_GAP
  return heights.reduce((sum, h) => sum + h, 0) + gaps
}

// Наименьший свободный слот снежинки в зоне эффекта
function freeSlot(nodes, type) {
  const zone = EFFECTS[type].zone
  const used = new Set(
    Object.values(nodes)
      .filter((n) => EFFECTS[n.type].zone === zone)
      .map((n) => n.slot)
  )

  let slot = 0
  while (used.has(slot)) slot++
  return slot
}

// ---------- Действия ----------

function addNodes(state, types) {
  const valid = (types || []).filter((t) => EFFECT_TYPES.includes(t))
  const room = MAX_NODES - nodeCount(state)
  const toAdd = valid.slice(0, Math.max(0, room))

  if (toAdd.length === 0) return state

  const nodes = { ...state.nodes }
  const columns = state.layout.columns.map((c) => [...c])
  let { cursor } = state.layout
  let { nextId } = state

  toAdd.forEach((type) => {
    const id = `n${nextId++}`
    nodes[id] = createNode(id, type, freeSlot(nodes, type))
    columns[cursor % columns.length].push(id)
    cursor++
  })

  return {
    ...state,
    nodes,
    layout: { ...state.layout, columns, cursor },
    nextId
  }
}

function moveNode(state, nodeId, toColumn, toIndex) {
  const { columns } = state.layout

  if (!state.nodes[nodeId]) return state
  if (toColumn < 0 || toColumn >= columns.length) return state

  const next = columns.map((c) => c.filter((id) => id !== nodeId))
  const target = next[toColumn]
  const index = Math.min(Math.max(0, toIndex ?? target.length), target.length)
  target.splice(index, 0, nodeId)

  return { ...state, layout: { ...state.layout, columns: next } }
}

function link(state, voice, nodeId) {
  if (!VOICES[voice] || !state.nodes[nodeId]) return state
  if (isLinked(state, voice, nodeId)) return state

  return { ...state, links: [...state.links, { voice, node: nodeId }] }
}

function unlink(state, voice, nodeId) {
  if (!isLinked(state, voice, nodeId)) return state

  return {
    ...state,
    links: state.links.filter((l) => !(l.voice === voice && l.node === nodeId))
  }
}

function setParam(state, nodeId, param, value) {
  const node = state.nodes[nodeId]
  if (!node) return state

  const normalized = normalizeParam(node.type, param, value)
  if (normalized === undefined) return state
  if (node.settings[param] === normalized) return state

  return {
    ...state,
    nodes: {
      ...state.nodes,
      [nodeId]: {
        ...node,
        settings: { ...node.settings, [param]: normalized }
      }
    }
  }
}

function setVoice(state, voice, key, value) {
  const normalized = normalizeVoiceSetting(voice, key, value)
  if (normalized === undefined) return state
  if (state.voices[voice][key] === normalized) return state

  return {
    ...state,
    voices: {
      ...state.voices,
      [voice]: { ...state.voices[voice], [key]: normalized }
    }
  }
}

// Сворачивание панели: 4 → 5 колонок, пятая появляется пустой.
// Разворачивание: 5 → 4, ноды из пятой колонки по одной уходят
// в конец самой короткой колонки (при равенстве — в левую)
function setPanel(state, open) {
  const { layout } = state
  if (layout.panelOpen === open) return state

  let columns = layout.columns.map((c) => [...c])

  if (!open) {
    while (columns.length < COLUMNS_PANEL_CLOSED) columns.push([])
  } else {
    const extra = columns.slice(COLUMNS_PANEL_OPEN).flat()
    columns = columns.slice(0, COLUMNS_PANEL_OPEN)

    extra.forEach((id) => {
      let shortest = 0
      columns.forEach((column, i) => {
        if (
          columnHeight(state, column) < columnHeight(state, columns[shortest])
        ) {
          shortest = i
        }
      })
      columns[shortest].push(id)
    })
  }

  return {
    ...state,
    layout: { ...layout, panelOpen: open, columns }
  }
}

function openVoice(state, voice) {
  const next = voice && VOICES[voice] ? voice : null
  if (state.ui.openVoice === next) return state

  return { ...state, ui: { ...state.ui, openVoice: next } }
}

// Контракт контролов из synth-controls: handleChange(property, value),
// где property — путь в состоянии массивом
function change(state, property, value) {
  if (!Array.isArray(property)) return state

  const [root, id, key, param] = property

  if (root === 'voices' && property.length === 3) {
    return setVoice(state, id, key, value)
  }

  if (root === 'nodes' && key === 'settings' && property.length === 4) {
    return setParam(state, id, param, value)
  }

  return state
}

export function reducer(state, action) {
  switch (action.type) {
    case 'ADD_NODES':
      return addNodes(state, action.types)
    case 'MOVE_NODE':
      return moveNode(state, action.nodeId, action.toColumn, action.toIndex)
    case 'LINK':
      return link(state, action.voice, action.nodeId)
    case 'UNLINK':
      return unlink(state, action.voice, action.nodeId)
    case 'SET_PARAM':
      return setParam(state, action.nodeId, action.param, action.value)
    case 'SET_VOICE':
      return setVoice(state, action.voice, action.key, action.value)
    case 'SET_PANEL':
      return setPanel(state, action.open)
    case 'OPEN_VOICE':
      return openVoice(state, action.voice)
    case 'CHANGE':
      return change(state, action.property, action.value)
    default:
      return state
  }
}
