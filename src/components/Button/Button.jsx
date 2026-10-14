import React from 'react'

import Icon from '../Icon/Icon.jsx'

// Кнопка из кита, высота 54. Тип определяется тем, что передано:
//   icon         — Icon (54 × 54);
//   icon + text  — Icon + Text;
//   text         — Text;
//   text + hotkey — Text + Hotkey (клавиша приглушена).
// faint — блеклая кнопка (текст White 20), например Add Effect;
//   она активна, при наведении текст White 60.
// label — подпись для экранного диктора, если у кнопки только иконка.

export default function Button({
  icon,
  text,
  hotkey,
  label,
  active = false,
  faint = false,
  disabled = false,
  handleClick
}) {
  const type = icon && text ? 'icon-text' : icon ? 'icon' : 'text'
  const classes = ['Button', `Button-${type}`]
  if (active) classes.push('is-active')
  if (faint) classes.push('is-faint')

  return (
    <button
      type="button"
      className={classes.join(' ')}
      aria-label={!text ? label : undefined}
      aria-pressed={active || undefined}
      aria-keyshortcuts={hotkey}
      disabled={disabled}
      onClick={handleClick}
    >
      {icon && <Icon name={icon} />}
      {text && <span className="text-button">{text}</span>}
      {hotkey && <span className="Button-hotkey text-button">{hotkey}</span>}
    </button>
  )
}
