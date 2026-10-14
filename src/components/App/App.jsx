import React, { useEffect, useReducer, useRef, useState } from 'react'

import { createEngine } from '../../audio/engine.js'

import { createInitialState, reducer } from '../../core/state.js'
import { VOICE_IDS } from '../../core/voices.js'
import LinkLayer from '../LinkLayer/LinkLayer.jsx'
import useLinkDrag from '../LinkLayer/useLinkDrag.js'
import NodeSpace from '../NodeSpace/NodeSpace.jsx'
import SnowflakePanel from '../SnowflakePanel/SnowflakePanel.jsx'
import StartOverlay from '../StartOverlay/StartOverlay.jsx'
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
  // пользователя, поэтому до первого клика экран закрыт подсказкой
  const engine = useRef(null)
  if (!engine.current) engine.current = createEngine()
  const latest = useRef(state)
  latest.current = state
  const [audio, setAudio] = useState('idle')

  useEffect(() => {
    engine.current.update(state)
  }, [state])

  // Протягивание связи голос → нода
  const { drag, startDrag } = useLinkDrag(dispatch)
  useEffect(() => {
    document.body.classList.toggle('is-linking', Boolean(drag))
  }, [drag !== null])

  // Статусы загрузки инструментов голосов (точки в Dropdown)
  const [statuses, setStatuses] = useState({})
  useEffect(
    () =>
      engine.current.onStatus((id, status) =>
        setStatuses((prev) => ({ ...prev, [id]: status }))
      ),
    []
  )

  // Esc закрывает открытую плашку голоса
  const openVoice = state.ui.openVoice
  useEffect(() => {
    if (!openVoice) return
    function handleEscape(event) {
      if (event.key === 'Escape') dispatch({ type: 'OPEN_VOICE', voice: null })
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [openVoice])

  // Вызывается прямо в обработчике жеста: Tone.start() внутри
  // должен успеть выполниться, пока жест «свежий» (важно для Safari)
  const started = useRef(false)
  function startAudio() {
    if (started.current) return
    started.current = true
    setAudio('loading')
    engine.current
      .start(latest.current)
      .then(() => setAudio('playing'))
      .catch((error) => {
        console.error(error)
        setAudio('error')
      })
  }

  // Клавиатура тоже жест: Enter, Space или любая клавиша до старта
  const startRef = useRef(startAudio)
  startRef.current = startAudio
  useEffect(() => {
    function handleKey(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      startRef.current()
    }
    window.addEventListener('keydown', handleKey)

    window.snowflake = {
      engine: engine.current,
      get state() {
        return latest.current
      },
      dispatch
    }
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  function handleChange(property, value) {
    dispatch({ type: 'CHANGE', property, value })
  }

  return (
    <main className="App">
      <SnowflakePanel
        state={state}
        open={panelOpen}
        handleToggle={() => dispatch({ type: 'SET_PANEL', open: !panelOpen })}
      />

      <div className="App-music">
        <div className="App-voices">
          {VOICE_IDS.map((id) => (
            <VoiceTab
              key={id}
              id={id}
              settings={state.voices[id]}
              open={state.ui.openVoice === id}
              status={statuses[id]}
              handleChange={handleChange}
              handleOpen={(voice) => dispatch({ type: 'OPEN_VOICE', voice })}
              handleLinkStart={startDrag}
              linking={drag?.voice === id}
            />
          ))}
        </div>

        <NodeSpace
          state={state}
          drag={drag}
          dispatch={dispatch}
          handleChange={handleChange}
        />
      </div>
      <LinkLayer drag={drag} voice={state.ui.openVoice} />
      <StartOverlay status={audio} handleStart={startAudio} />
    </main>
  )
}
