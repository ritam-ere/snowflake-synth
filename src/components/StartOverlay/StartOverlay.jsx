import React, { useEffect, useRef } from 'react'

// Подсказка поверх экрана до первого звука. Браузеры (Chrome, Safari)
// включают звук только после жеста пользователя, поэтому музыка
// стартует по первому клику, касанию или клавише.
//
// status:
//   idle    — «Click anywhere to start»;
//   loading — сэмплы грузятся;
//   error   — звук не запустился, нужна перезагрузка страницы;
//   playing — подсказка плавно исчезает.

const TEXT = {
  idle: 'Click anywhere to start',
  loading: 'Loading sounds…',
  error: 'Sound could not start. Reload the page'
}

export default function StartOverlay({ status, handleStart }) {
  const button = useRef(null)

  useEffect(() => {
    if (status === 'idle') button.current?.focus({ preventScroll: true })
  }, [status])

  const classes = ['StartOverlay', `is-${status}`]

  return (
    <div className={classes.join(' ')} aria-hidden={status === 'playing'}>
      <button
        ref={button}
        type="button"
        className="StartOverlay-button"
        // pointerup и click — жесты, после которых Safari и Chrome
        // разрешают звук; pointerdown в Safari на тач-экранах не считается
        onClick={handleStart}
        disabled={status !== 'idle'}
        tabIndex={status === 'playing' ? -1 : 0}
      >
        <span className="StartOverlay-title text-voice">snowflake</span>
        <span className="StartOverlay-hint text-button">{TEXT[status]}</span>
      </button>
    </div>
  )
}
