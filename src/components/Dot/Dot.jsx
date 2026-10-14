import React from 'react'

// Точка связи голоса (Dot из кита) в цвете голоса.
//   default — 10px: голос подключён к ноде;
//   add     — 32px с «+»: подключить голос;
//   delete  — 32px с «×»: отключить голос.
// Обводка 4px цвета фона отделяет точку от того, на чём она лежит
// (у add и delete — пунктирная). Кликабельна, если передан handleClick.

export default function Dot({
  voice,
  variant = 'default',
  label,
  handleClick
}) {
  const classes = ['Dot', `Dot-${variant}`, `Dot-${voice}`]
  const content = variant === 'default' ? null : <span className="Dot-sign" />

  if (!handleClick) {
    return <span className={classes.join(' ')}>{content}</span>
  }

  return (
    <button
      type="button"
      className={classes.join(' ')}
      aria-label={label}
      onClick={handleClick}
    >
      {content}
    </button>
  )
}
