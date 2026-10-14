import React, { useReducer } from 'react'

import { createInitialState, reducer } from '../../core/state.js'
import { VOICE_IDS } from '../../core/voices.js'
import NodeSpace from '../NodeSpace/NodeSpace.jsx'
import SnowflakePanel from '../SnowflakePanel/SnowflakePanel.jsx'
import VoiceTab from '../VoiceTab/VoiceTab.jsx'

// Корневой компонент: экран Starter из макета.
// Состояние проекта живёт здесь, в редьюсере ядра; компоненты получают
// его части и сообщают об изменениях через handleChange(property, value)
// или dispatch(action)
export default function App() {
  const [state, dispatch] = useReducer(reducer, null, createInitialState)

  function handleChange(property, value) {
    dispatch({ type: 'CHANGE', property, value })
  }

  return (
    <main className="App">
      <SnowflakePanel open={state.layout.panelOpen} />

      <div className="App-music">
        <div className="App-voices">
          {VOICE_IDS.map((id) => (
            <VoiceTab key={id} id={id} />
          ))}
        </div>

        <NodeSpace
          state={state}
          dispatch={dispatch}
          handleChange={handleChange}
        />
      </div>
    </main>
  )
}
