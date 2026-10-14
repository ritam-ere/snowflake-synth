import React from 'react'

import { EFFECTS } from '../../core/effects.js'
import { voicesOfNode } from '../../core/state.js'
import Dot from '../Dot/Dot.jsx'
import FxControls from './FxControls.jsx'

// Нода эффекта (Fx из кита): карточка высотой из кита, бейдж с названием
// сверху, «лампочки» подключённых голосов слева и контролы по киту
export default function Fx({
  state,
  nodeId,
  linkTarget,
  focusVoice,
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
    >
      <span className="Fx-badge text-small">{spec.label}</span>

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

      <FxControls node={node} handleChange={handleChange} />
    </article>
  )
}
