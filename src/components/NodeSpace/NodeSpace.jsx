import React, { useRef, useState } from 'react'

import {
  MAX_NODES,
  canAddNodes,
  nextColumnIndex,
  nodeCount
} from '../../core/state.js'
import AddFx from '../AddFx/AddFx.jsx'
import AddFxPopover from '../AddFxPopover/AddFxPopover.jsx'
import Button from '../Button/Button.jsx'
import Fx from '../Fx/Fx.jsx'
import useNodeDrag from './useNodeDrag.js'

// Поле нод: колонки из состояния ядра (4 при раскрытой панели, 5 при
// свёрнутой). Карточка Add Effect — в конце колонки, куда ляжет
// следующая нода, клик по ней открывает выбор эффектов.
// Ноды можно переставлять, потянув за бейдж (useNodeDrag).
// Edit (или F) — режим редактирования: у нод кнопки выбора, внизу
// Reset All (убрать все эффекты) и Delete (удалить выбранные).
// Export пока неактивна
export default function NodeSpace({ state, drag, dispatch, handleChange }) {
  const focusVoice = state.ui.openVoice
  const addCard = useRef(null)
  const [adding, setAdding] = useState(false)
  const canAdd = canAddNodes(state)
  const { columns } = state.layout
  const addColumn = nextColumnIndex(state)
  const columnsRef = useRef(null)
  const { dragging, startNodeDrag } = useNodeDrag(state, dispatch, columnsRef)
  const { editing, selected } = state.ui

  return (
    <section className="NodeSpace" aria-label="Effects">
      <div className="NodeSpace-columns" ref={columnsRef}>
        {columns.map((column, i) => (
          <div className="NodeSpace-column" key={i}>
            {column.map((nodeId) => (
              <Fx
                key={nodeId}
                state={state}
                nodeId={nodeId}
                linkTarget={drag?.target === nodeId ? drag.voice : null}
                focusVoice={focusVoice}
                dragging={dragging === nodeId}
                editing={editing}
                selected={selected.includes(nodeId)}
                handleSelect={(id) =>
                  dispatch({ type: 'TOGGLE_SELECTED', nodeId: id })
                }
                handleDragStart={startNodeDrag}
                handleUnlink={(voice, id) =>
                  dispatch({ type: 'UNLINK', voice, nodeId: id })
                }
                handleChange={handleChange}
              />
            ))}
            {i === addColumn && (
              <AddFx
                ref={addCard}
                disabled={!canAdd}
                open={adding}
                handleClick={() => setAdding((open) => !open)}
              />
            )}
          </div>
        ))}
      </div>

      {adding && canAdd && (
        <AddFxPopover
          anchor={addCard.current}
          room={MAX_NODES - nodeCount(state)}
          handleAdd={(types) => {
            dispatch({ type: 'ADD_NODES', types })
            setAdding(false)
          }}
          handleClose={() => setAdding(false)}
        />
      )}

      <div className="NodeSpace-buttons">
        {editing && (
          <>
            <Button
              text="Reset All"
              handleClick={() => dispatch({ type: 'RESET_NODES' })}
            />
            <Button
              text={selected.length ? `Delete ${selected.length}` : 'Delete'}
              faint={selected.length === 0}
              handleClick={() => dispatch({ type: 'DELETE_SELECTED' })}
            />
          </>
        )}
        <Button
          text="Edit"
          hotkey="F"
          active={editing}
          handleClick={() => dispatch({ type: 'SET_EDITING', on: !editing })}
        />
        <Button icon="export" label="Export" />
      </div>
    </section>
  )
}
