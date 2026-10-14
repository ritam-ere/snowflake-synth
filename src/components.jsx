import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'

import Knob from './components/Knob/Knob.jsx'
import { EFFECTS, EFFECT_TYPES, defaultSettings } from './core/effects.js'

// Витрина контролов: каждый контрол как в ките и с текущим значением.
// Состояние витрины — как у будущего App: value + handleChange(property, value)

// Параметры, которые в макете управляются кнобом
const KNOB_PARAMS = {
  reverb: ['decay', 'mix'],
  delay: ['feedback', 'mix'],
  chorus: ['depth', 'mix', 'rate'],
  distortion: ['drive', 'mix'],
  phaser: ['freq', 'mix'],
  vibrato: ['depth', 'mix'],
  pitchShift: ['mix']
}

function capitalize(name) {
  return name[0].toUpperCase() + name.slice(1)
}

function Showcase() {
  const [values, setValues] = useState(() => ({
    kit: { half: 0.5, threeQuarters: 0.75 },
    ...Object.fromEntries(
      EFFECT_TYPES.map((type) => [type, defaultSettings(type)])
    )
  }))

  // Тот же контракт, что в курсе: property — путь в состоянии
  function handleChange([group, key], value) {
    setValues((prev) => ({
      ...prev,
      [group]: { ...prev[group], [key]: value }
    }))
  }

  return (
    <main className="Showcase">
      <h1 className="text-button">Components</h1>
      <p className="text-label note">
        Витрина контролов синтезатора. Каждый контрол выглядит как в UI Kit и
        работает: тяните, крутите колесо, нажимайте стрелки.
      </p>

      <section>
        <h2 className="text-button">Knob</h2>
        <p className="text-label hint">
          Тянуть вверх / вниз, с Shift — точнее. Двойной клик — значение по
          умолчанию. Колесо и стрелки — мелкий шаг. Во время вращения подпись
          показывает значение.
        </p>

        <div className="row">
          <div className="card">
            <span className="text-small card-title">Kit: 50% / 75%</span>
            <div className="controls">
              <Knob
                name="Decay"
                property={['kit', 'half']}
                value={values.kit.half}
                min={0}
                max={1}
                defaultValue={0.5}
                unit="%"
                handleChange={handleChange}
              />
              <Knob
                name="Decay"
                property={['kit', 'threeQuarters']}
                value={values.kit.threeQuarters}
                min={0}
                max={1}
                defaultValue={0.75}
                unit="%"
                handleChange={handleChange}
              />
            </div>
          </div>

          {EFFECT_TYPES.map((type) => (
            <div className="card" key={type}>
              <span className="text-small card-title">
                {EFFECTS[type].label}
              </span>
              <div className="controls">
                {KNOB_PARAMS[type].map((param) => {
                  const spec = EFFECTS[type].params[param]
                  return (
                    <Knob
                      key={param}
                      name={capitalize(param)}
                      property={[type, param]}
                      value={values[type][param]}
                      min={spec.min}
                      max={spec.max}
                      defaultValue={spec.default}
                      scale={spec.scale}
                      unit={spec.unit}
                      handleChange={handleChange}
                    />
                  )
                })}
              </div>
              <span className="text-small value">
                {KNOB_PARAMS[type]
                  .map((param) => `${param} ${+values[type][param].toFixed(3)}`)
                  .join(' · ')}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

document.addEventListener('DOMContentLoaded', () => {
  createRoot(document.getElementById('root')).render(<Showcase />)
})
