import React from 'react'

import Button from '../Button/Button.jsx'

// Панель снежинки (слева): 324 px раскрыта, 80 px свёрнута.
// Пока внутри заготовка клина из макета; настоящая снежинка — в вехе M6.
// Клин не убирается из DOM, а плавно гаснет, чтобы анимация шла ровно
export default function SnowflakePanel({ open, handleToggle }) {
  return (
    <aside className={open ? 'SnowflakePanel' : 'SnowflakePanel is-closed'}>
      <div className="SnowflakePanel-toggle">
        <Button
          icon="collapse"
          label={open ? 'Collapse panel' : 'Expand panel'}
          handleClick={handleToggle}
        />
      </div>

      <svg
        className="SnowflakePanel-wedge"
        width="205"
        height="576"
        viewBox="0 0 205 576"
        aria-hidden="true"
      >
        <path d="M0 0H205L201 568C201 574 196 577 194 572L0 0Z" />
      </svg>
    </aside>
  )
}
