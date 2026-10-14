import React from 'react'

import { EFFECTS } from '../../core/effects.js'
import Knob from '../Knob/Knob.jsx'
import Steps from '../Steps/Steps.jsx'
import StepsPair from '../Steps/StepsPair.jsx'
import Strip from '../Strip/Strip.jsx'

// Контролы внутри ноды по раскладке кита (раздел «Fx» в design-spec):
// две колонки по 70 px со сдвигом 86 (в ките left 27 и 113),
// под ними полоска 156 px или переключатели.
// Каждый контрол меняет настройку ноды в ядре:
// handleChange(['nodes', id, 'settings', param], value)

// Что и где стоит в каждой ноде: [параметр, вид контрола, место]
const LAYOUTS = {
  reverb: [
    ['decay', 'knob', 'left'],
    ['mix', 'knob', 'right']
  ],
  pitchShift: [
    ['interval', 'steps', 'left-steps'],
    ['mix', 'knob', 'right']
  ],
  vibrato: [
    ['depth', 'knob', 'left'],
    ['mix', 'knob', 'right'],
    ['rate', 'wave', 'strip']
  ],
  phaser: [
    ['freq', 'knob', 'left'],
    ['mix', 'knob', 'right'],
    ['oct', 'bricks', 'strip']
  ],
  distortion: [
    ['drive', 'knob', 'left'],
    ['mix', 'knob', 'right'],
    ['tone', 'gradient', 'strip']
  ],
  chorus: [
    ['depth', 'knob', 'left'],
    ['mix', 'knob', 'right'],
    ['wave', 'steps', 'left-low'],
    ['rate', 'knob', 'right-low']
  ],
  delay: [
    ['feedback', 'knob', 'left'],
    ['mix', 'knob', 'right'],
    ['time', 'pair', 'time'],
    ['pingPong', 'toggle', 'pingpong']
  ]
}

function capitalize(name) {
  return name[0].toUpperCase() + name.slice(1)
}

export default function FxControls({ node, inert = false, handleChange }) {
  const { params } = EFFECTS[node.type]
  const property = (param) => ['nodes', node.id, 'settings', param]

  function render(param, kind) {
    const spec = params[param]
    const value = node.settings[param]

    if (kind === 'knob') {
      return (
        <Knob
          name={capitalize(param)}
          property={property(param)}
          value={value}
          min={spec.min}
          max={spec.max}
          defaultValue={spec.default}
          scale={spec.scale}
          unit={spec.unit}
          handleChange={handleChange}
        />
      )
    }

    if (kind === 'steps') {
      return (
        <Steps
          name={capitalize(param)}
          property={property(param)}
          value={value}
          options={spec.options}
          labels={spec.labels}
          handleChange={handleChange}
        />
      )
    }

    if (kind === 'pair') {
      return (
        <StepsPair
          name="Time"
          left={{ property: property('timeL'), value: node.settings.timeL }}
          right={{ property: property('timeR'), value: node.settings.timeR }}
          options={params.timeL.options}
          labels={params.timeL.labels}
          handleChange={handleChange}
        />
      )
    }

    if (kind === 'toggle') {
      return (
        <Steps
          name="PingPong"
          orientation="horizontal"
          property={property(param)}
          value={value}
          options={[true, false]}
          labels={spec.labels}
          handleChange={handleChange}
        />
      )
    }

    return (
      <Strip
        name={capitalize(param)}
        property={property(param)}
        value={value}
        min={spec.min}
        max={spec.max}
        defaultValue={spec.default}
        scale={spec.scale}
        unit={spec.unit}
        variant={kind}
        handleChange={handleChange}
      />
    )
  }

  return (
    <div className="FxControls" inert={inert}>
      {LAYOUTS[node.type].map(([param, kind, place]) => (
        <div key={param} className={`FxControls-slot is-${place}`}>
          {render(param, kind)}
        </div>
      ))}
    </div>
  )
}
