import React from 'react'

// Иконки 28 × 28 из кита: Add, Export, Collapse.
// Рисуются линией в цвет текста (currentColor)

const PATHS = {
  add: <path d="M14 7.5V20.5M7.5 14H20.5" />,
  export: (
    <>
      <path d="M14 5.5V16.5M9 11.5L14 16.5L19 11.5" />
      <path d="M6.5 17.5V21.5H21.5V17.5" />
    </>
  ),
  collapse: (
    <>
      <rect x="4" y="6.5" width="20" height="15" rx="3.5" />
      <path d="M11 6.5V21.5" />
    </>
  )
}

export const ICONS = Object.keys(PATHS)

export default function Icon({ name, className = '' }) {
  return (
    <svg
      className={`Icon ${className}`}
      width="28"
      height="28"
      viewBox="0 0 28 28"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}
