import React from 'react'

import { canAddNodes, nextColumnIndex } from '../../core/state.js'
import AddFx from '../AddFx/AddFx.jsx'
import Button from '../Button/Button.jsx'
import Fx from '../Fx/Fx.jsx'

// Поле нод: колонки из состояния ядра (4 при раскрытой панели, 5 при
// свёрнутой). Карточка Add Effect — в конце колонки, куда ляжет
// следующая нода. Кнопки Edit и Export внизу справа пока неактивны
export default function NodeSpace({ state, handleChange }) {
  const { columns } = state.layout
  const addColumn = nextColumnIndex(state)

  return (
    <section className="NodeSpace" aria-label="Effects">
      <div className="NodeSpace-columns">
        {columns.map((column, i) => (
          <div className="NodeSpace-column" key={i}>
            {column.map((nodeId) => (
              <Fx
                key={nodeId}
                state={state}
                nodeId={nodeId}
                handleChange={handleChange}
              />
            ))}
            {i === addColumn && <AddFx disabled={!canAddNodes(state)} />}
          </div>
        ))}
      </div>

      <div className="NodeSpace-buttons">
        <Button text="Edit" hotkey="F" />
        <Button icon="export" label="Export" />
      </div>
    </section>
  )
}
