// Синхронизация аудиографа с состоянием ядра (задача 1.5).
// Чистые функции без звука: по состоянию считают, какие эффекты и посылы
// нужно создать, обновить и удалить. Их проверяют тесты.
//
// Граф из двух частей:
//   экземпляры — сами эффекты;
//   посылы — связи «голос → экземпляр» со своим плавным включением.
//
// Настройки принадлежат ноде, поэтому у всех голосов одной ноды они
// одинаковые. Для линейных эффектов (реверберация, эхо, модуляция,
// сдвиг высоты) обработать сумму голосов — то же самое, что обработать
// каждый голос отдельно и сложить. Поэтому такой эффект — один экземпляр
// на ноду: в 3 раза меньше нагрузки на процессор и никакого треска.
// Перегруз нелинеен (голоса вместе искажаются иначе, чем по отдельности),
// поэтому у Distortion свой экземпляр на каждый голос.
//
// Порядок нод в колонках на звук не влияет: эффекты подключены параллельно.

const PER_VOICE = new Set(['distortion'])

export function tapKey(nodeId, voice) {
  return `${nodeId}:${voice}`
}

export function instanceKey(nodeId, voice, type) {
  return PER_VOICE.has(type) ? tapKey(nodeId, voice) : nodeId
}

// Желаемый граф:
//   instances: ключ экземпляра → { type, settings }
//   taps:      ключ посыла → { voice, instance }
export function desiredGraph(state) {
  const instances = new Map()
  const taps = new Map()

  state.links.forEach(({ voice, node: nodeId }) => {
    const node = state.nodes[nodeId]
    if (!node) return

    const instance = instanceKey(nodeId, voice, node.type)
    instances.set(instance, { type: node.type, settings: node.settings })
    taps.set(tapKey(nodeId, voice), { voice, instance })
  })

  return { instances, taps }
}

export const EMPTY_GRAPH = { instances: new Map(), taps: new Map() }

// Разница между тем, что звучит (applied), и тем, что нужно (desired).
// Настройки сравниваются по ссылке: редьюсер создаёт новый объект
// settings только когда параметр действительно изменился
export function diffGraph(applied, desired) {
  const addInstances = []
  const updateInstances = []
  const removeInstances = []
  const addTaps = []
  const removeTaps = []

  applied.instances.forEach((current, key) => {
    const next = desired.instances.get(key)
    if (!next || next.type !== current.type) removeInstances.push(key)
  })

  desired.instances.forEach((next, key) => {
    const current = applied.instances.get(key)
    if (!current || current.type !== next.type) addInstances.push(key)
    else if (current.settings !== next.settings) updateInstances.push(key)
  })

  // Посыл пересоздаётся, если его экземпляр пересоздаётся
  const recreated = new Set(addInstances)

  applied.taps.forEach((current, key) => {
    const next = desired.taps.get(key)
    if (
      !next ||
      next.instance !== current.instance ||
      recreated.has(next.instance)
    ) {
      removeTaps.push(key)
    }
  })

  desired.taps.forEach((next, key) => {
    const current = applied.taps.get(key)
    if (
      !current ||
      current.instance !== next.instance ||
      recreated.has(next.instance)
    ) {
      addTaps.push(key)
    }
  })

  return { addInstances, updateInstances, removeInstances, addTaps, removeTaps }
}
