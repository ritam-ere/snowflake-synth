import React, { forwardRef } from 'react'

import Icon from '../Icon/Icon.jsx'

// Карточка Add Effect: пунктирная, блеклая. Клик открывает поповер
// выбора эффектов (AddFxPopover); на 12 нодах карточка неактивна
const AddFx = forwardRef(function AddFx(
  { disabled = false, open = false, handleClick },
  ref
) {
  return (
    <button
      ref={ref}
      aria-haspopup="dialog"
      aria-expanded={open}
      type="button"
      className={open ? 'AddFx is-open' : 'AddFx'}
      disabled={disabled}
      onClick={handleClick}
    >
      <Icon name="add" />
      <span className="text-button">Add Effect</span>
    </button>
  )
})

export default AddFx
