import { useState } from 'react'

// Рамка фокуса только когда на контрол перешли клавишей Tab.
// При работе мышью, пальцем или стрелками рамки нет.
// Возвращает флаг и обработчики, которые вешаются на фокусируемый элемент
export default function useKeyboardFocus() {
  const [keyboard, setKeyboard] = useState(false)

  return {
    keyboard,
    focusHandlers: {
      onKeyUp: (event) => {
        if (event.key === 'Tab') setKeyboard(true)
      },
      onPointerDown: () => setKeyboard(false),
      onBlur: () => setKeyboard(false)
    }
  }
}
