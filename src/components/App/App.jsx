import React, { useEffect, useReducer, useRef } from 'react'

import { createEngine } from '../../audio/engine.js'

import { createInitialState, reducer } from '../../core/state.js'
import { VOICE_IDS } from '../../core/voices.js'
import NodeSpace from '../NodeSpace/NodeSpace.jsx'
import SnowflakePanel from '../SnowflakePanel/SnowflakePanel.jsx'
import VoiceTab from '../VoiceTab/VoiceTab.jsx'
import { loadPanelOpen, savePanelOpen } from './storage.js'

// Корневой компонент: экран Starter из макета.
// Состояние проекта живёт здесь, в редьюсере ядра; компоненты получают
// его части и сообщают об изменениях через handleChange(property, value)
// или dispatch(action)
export default function App() {
  // Стартовое состояние — как в макете; свёрнутость панели браузер помнит
  const [state, dispatch] = useReducer(reducer, null, () =>
    reducer(createInitialState(), { type: 'SET_PANEL', open: loadPanelOpen() })
  )

  const panelOpen = state.layout.panelOpen
  useEffect(() => savePanelOpen(panelOpen), [panelOpen])

  // Звук: движок читает состояние ядра и пересобирает аудиограф
  // при каждом изменении. Браузер разрешает звук только после жеста
  // пользователя, поэтому музыка стартует по первому клику
  // (подсказка поверх экрана — задача 3.4)
  const engine = useRef(null)
  if (!engine.current) engine.current = createEngine()
  const latest = useRef(state)
  latest.current = state

  useEffect(() => {
    engine.current.update(state)
  }, [state])

  useEffect(() => {
    function start() {
      document.removeEventListener('pointerdown', start, true)
      engine.current.start(latest.current)
    }
    document.addEventListener('pointerdown', start, true)
    window.snowflake = {
      engine: engine.current,
      get state() {
        return latest.current
      },
      dispatch
    }
    return () => document.removeEventListener('pointerdown', start, true)
  }, [])

  function handleChange(property, value) {
    dispatch({ type: 'CHANGE', property, value })
  }

  return (
    <main className="App">
      <SnowflakePanel
        open={panelOpen}
        handleToggle={() => dispatch({ type: 'SET_PANEL', open: !panelOpen })}
      />

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
