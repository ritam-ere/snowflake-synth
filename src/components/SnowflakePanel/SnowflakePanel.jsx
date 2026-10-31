import React from 'react'

import Button from '../Button/Button.jsx'
import Snowfall from '../Snowfall/Snowfall.jsx'

// Панель слева: 324 px раскрыта, 80 px свёрнута. Внутри — снегопад:
// каждая сыгранная нота выпускает пиксельную снежинку, эффекты голоса
// меняют её вид и полёт (components/Snowfall)
export default function SnowflakePanel({ state, engine, open, handleToggle }) {
  return (
    <aside className={open ? 'SnowflakePanel' : 'SnowflakePanel is-closed'}>
      <Snowfall engine={engine} state={state} />

      <div className="SnowflakePanel-toggle">
        <Button
          icon="collapse"
          label={open ? 'Collapse panel' : 'Expand panel'}
          handleClick={handleToggle}
        />
      </div>
    </aside>
  )
}
