import React from 'react'

import Button from '../Button/Button.jsx'

// Панель снежинки (слева). Пока — заготовка клина из макета;
// настоящая снежинка появится в вехе M6, сворачивание — в задаче 3.2
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

      {open && (
        <svg
          className="SnowflakePanel-wedge"
          width="205"
          height="576"
          viewBox="0 0 205 576"
          aria-hidden="true"
        >
          <path d="M0 0H205L201 568C201 574 196 577 194 572L0 0Z" />
        </svg>
      )}
    </aside>
  )
}
