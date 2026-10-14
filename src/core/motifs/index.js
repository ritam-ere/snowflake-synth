// Мотивы вырезов (раздел 9 ТЗ, задачи 6.2–6.3): ажур бумажной снежинки
// в трёх стилях на выбор. Таблица «параметр → узор» у всех стилей одна,
// различается только рисунок бумаги.
//
// Чистые функции: вырез + его область → список фигур в координатах
// клина (x — от хребта влево, y — от вершины вверх), см. common.js.

import { flora } from './flora.js'
import { frost } from './frost.js'
import { geometry } from './geometry.js'

export const STYLES = {
  geometry: { label: 'Geometry', motifs: geometry },
  flora: { label: 'Flora', motifs: flora },
  frost: { label: 'Frost', motifs: frost }
}

export const STYLE_IDS = Object.keys(STYLES)
export const DEFAULT_STYLE = 'geometry'

export function motif(cut, style = DEFAULT_STYLE) {
  const motifs = (STYLES[style] || STYLES[DEFAULT_STYLE]).motifs
  return motifs[cut.type](cut)
}
