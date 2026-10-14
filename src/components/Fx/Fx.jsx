import React from 'react'

import { EFFECTS } from '../../core/effects.js'
import { voicesOfNode } from '../../core/state.js'
import Dot from '../Dot/Dot.jsx'
import FxControls from './FxControls.jsx'

// Нода эффекта (Fx из кита): карточка высотой из кита, бейдж с названием
// сверху, «лампочки» подключённых голосов слева и контролы по киту.
// В режиме Edit контролы не крутятся, справа сверху — круглая кнопка
// выбора; клик по карточке тоже выбирает, наведённая карточка дрожит
export default function Fx({
  state,
  nodeId,
  linkTarget,
  focusVoice,
  dragging = false,
  editing = false,
  selected = false,
  handleSelect,
  handleDragStart,
  handleChange,
  handleUnlink
}) {
  const node = state.nodes[nodeId]
  const spec = EFFECTS[node.type]
  const voices = voicesOfNode(state, nodeId)

  // Подсветка, когда над нодой отпускают протянутую связь
  const classes = ['Fx', `Fx-${node.type}`]
  // Режим связей: открыта плашка голоса — ноды без него затемнены
  if (focusVoice && !voices.includes(focusVoice)) classes.push('is-dimmed')
  if (dragging) classes.push('is-placeholder')
  if (editing) classes.push('is-editing')
  if (selected) classes.push('is-selected')
  if (linkTarget) {
    classes.push('is-link-target', `is-link-${linkTarget}`)
    if (voices.includes(linkTarget)) classes.push('is-linked-already')
  }

  return (
    <article
      className={classes.join(' ')}
      data-node-id={nodeId}
      style={{ height: spec.height }}
      aria-label={spec.label}
      onClick={(event) => {
        // бейдж — ручка перетаскивания, его клик не выбирает ноду
        if (editing && !event.target.closest('.Fx-badge, .Fx-dots')) {
          handleSelect(nodeId)
        }
      }}
    >
      <span
        className="Fx-badge text-small"
        title="Drag to move"
        onPointerDown={(event) => handleDragStart?.(nodeId, event)}
      >
        {spec.label}
      </span>

      {voices.length > 0 && (
        <span className="Fx-dots">
          {voices.map((voice) => (
            <span key={voice} className="Fx-lamp" data-lamp={voice}>
              <Dot voice={voice} />
              {/* Наведение на лампочку → «×»: клик отключает голос от ноды */}
              <span className="Fx-unlink">
                <Dot
                  voice={voice}
                  variant="delete"
                  label={`Unlink ${voice} from ${spec.label}`}
                  handleClick={() => handleUnlink(voice, nodeId)}
                />
              </span>
            </span>
          ))}
        </span>
      )}

      {editing && (
        <button
          type="button"
          className="Fx-select"
          aria-pressed={selected}
          aria-label={`Select ${spec.label}`}
          onClick={(event) => {
            event.stopPropagation()
            handleSelect(nodeId)
          }}
        >
          <span className="Fx-check" />
        </button>
      )}

      <FxControls node={node} inert={editing} handleChange={handleChange} />
    </article>
  )
}
