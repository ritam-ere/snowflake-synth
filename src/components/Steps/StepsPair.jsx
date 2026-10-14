import React from 'react'

import Steps from './Steps.jsx'

// Два столбика рядом с общей подписью (Time у Delay):
// L и R приглушены по краям, название — по центру
export default function StepsPair({
  name,
  left,
  right,
  options,
  labels,
  handleChange
}) {
  return (
    <div className="StepsPair">
      <div className="StepsPair-columns">
        <Steps
          name={`${name} L`}
          property={left.property}
          value={left.value}
          options={options}
          labels={labels}
          handleChange={handleChange}
          className="StepsPair-steps"
        />
        <Steps
          name={`${name} R`}
          property={right.property}
          value={right.value}
          options={options}
          labels={labels}
          handleChange={handleChange}
          className="StepsPair-steps"
        />
      </div>

      <div className="StepsPair-labels text-label">
        <span className="StepsPair-side">L</span>
        <span>{name}</span>
        <span className="StepsPair-side">R</span>
      </div>
    </div>
  )
}
