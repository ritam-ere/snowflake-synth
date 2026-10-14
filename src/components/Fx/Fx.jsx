import React from 'react'

import { EFFECTS } from '../../core/effects.js'
import { voicesOfNode } from '../../core/state.js'
import Dot from '../Dot/Dot.jsx'
import FxControls from './FxControls.jsx'

// Нода эффекта (Fx из кита): карточка высотой из кита, бейдж с названием
// сверху, «лампочки» подключённых голосов слева и контролы по киту
export default function Fx({ state, nodeId, handleChange }) {
  const node = state.nodes[nodeId]
  const spec = EFFECTS[node.type]
  const voices = voicesOfNode(state, nodeId)

  return (
    <article
      className={`Fx Fx-${node.type}`}
      style={{ height: spec.height }}
      aria-label={spec.label}
    >
      <span className="Fx-badge text-small">{spec.label}</span>

      {voices.length > 0 && (
        <span className="Fx-dots">
          {voices.map((voice) => (
            <Dot key={voice} voice={voice} />
          ))}
        </span>
      )}

      <FxControls node={node} handleChange={handleChange} />
    </article>
  )
}
