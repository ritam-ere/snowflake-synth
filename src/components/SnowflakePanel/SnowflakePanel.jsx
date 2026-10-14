import React from 'react'

import Button from '../Button/Button.jsx'
import Snowflake from '../Snowflake/Snowflake.jsx'

// Панель снежинки (слева): 324 px раскрыта, 80 px свёрнута.
// Внутри — сложенный клин снежинки, вырезанный эффектами (веха M6).
// Клин не убирается из DOM, а плавно гаснет, чтобы анимация шла ровно
export default function SnowflakePanel({ state, open, handleToggle }) {
  return (
    <aside className={open ? 'SnowflakePanel' : 'SnowflakePanel is-closed'}>
      <div className="SnowflakePanel-toggle">
        <Button
          icon="collapse"
          label={open ? 'Collapse panel' : 'Expand panel'}
          handleClick={handleToggle}
        />
      </div>

      <div className="SnowflakePanel-wedge">
        <Snowflake state={state} />
      </div>
    </aside>
  )
}
