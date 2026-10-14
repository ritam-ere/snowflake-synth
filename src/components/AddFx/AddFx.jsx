import React from 'react'

import Icon from '../Icon/Icon.jsx'

// Карточка Add Effect: пунктирная, блеклая. Поповер выбора эффектов —
// задача 5.1; на 12 нодах карточка неактивна
export default function AddFx({ disabled = false, handleClick }) {
  return (
    <button
      type="button"
      className="AddFx"
      disabled={disabled}
      onClick={handleClick}
    >
      <Icon name="add" />
      <span className="text-button">Add Effect</span>
    </button>
  )
}
