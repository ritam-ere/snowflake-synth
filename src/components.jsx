import React, { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

import Button from './components/Button/Button.jsx'
import Dot from './components/Dot/Dot.jsx'
import Dropdown from './components/Dropdown/Dropdown.jsx'
import Icon, { ICONS } from './components/Icon/Icon.jsx'
import Knob from './components/Knob/Knob.jsx'
import Steps from './components/Steps/Steps.jsx'
import StepsPair from './components/Steps/StepsPair.jsx'
import Strip from './components/Strip/Strip.jsx'
import { EFFECTS, EFFECT_TYPES, defaultSettings } from './core/effects.js'
import { INSTRUMENT_LABELS, VOICES, VOICE_IDS } from './core/voices.js'

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
    voice: { lead: 80, bass: 80, extra: 80 },
    instrument: Object.fromEntries(
      VOICE_IDS.map((id) => [id, VOICES[id].defaults.instrument])
    ),
    status: { lead: 'ready', bass: 'ready', extra: 'ready' },
    links: { lead: true, bass: true, extra: false },
    ui: { panel: true, clicks: 0 },
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

  // Витрина изображает загрузку сэмплов: 1,5 с после выбора инструмента.
  // Soft sine и FM keys — синтезаторы, грузить им нечего; Harp — пример ошибки
  const timers = useRef({})
  function handleInstrument(property, value) {
    const [, voice] = property
    handleChange(property, value)
    clearTimeout(timers.current[voice])

    if (value === 'soft-sine' || value === 'fm-keys') {
      handleChange(['status', voice], 'ready')
      return
    }
    handleChange(['status', voice], 'loading')
    timers.current[voice] = setTimeout(
      () =>
        handleChange(['status', voice], value === 'harp' ? 'error' : 'ready'),
      1500
    )
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

      <section>
        <h2 className="text-button">Steps</h2>
        <p className="text-label hint">
          Выбор одного варианта: клик или стрелки. Неактивные варианты — текст
          белый 60%.
        </p>

        <div className="row">
          <div className="card">
            <span className="text-small card-title">P SHIFT</span>
            <Steps
              name="Interval"
              property={['pitchShift', 'interval']}
              value={values.pitchShift.interval}
              options={EFFECTS.pitchShift.params.interval.options}
              labels={EFFECTS.pitchShift.params.interval.labels}
              handleChange={handleChange}
            />
            <span className="text-small value">
              interval {values.pitchShift.interval}
            </span>
          </div>

          <div className="card">
            <span className="text-small card-title">CHORUS</span>
            <Steps
              name="Wave"
              property={['chorus', 'wave']}
              value={values.chorus.wave}
              options={EFFECTS.chorus.params.wave.options}
              handleChange={handleChange}
            />
            <span className="text-small value">wave {values.chorus.wave}</span>
          </div>

          <div className="card">
            <span className="text-small card-title">DELAY</span>
            <StepsPair
              name="Time"
              left={{ property: ['delay', 'timeL'], value: values.delay.timeL }}
              right={{
                property: ['delay', 'timeR'],
                value: values.delay.timeR
              }}
              options={EFFECTS.delay.params.timeL.options}
              labels={EFFECTS.delay.params.timeL.labels}
              handleChange={handleChange}
            />
            <Steps
              name="PingPong"
              orientation="horizontal"
              property={['delay', 'pingPong']}
              value={values.delay.pingPong}
              options={[true, false]}
              labels={EFFECTS.delay.params.pingPong.labels}
              handleChange={handleChange}
            />
            <span className="text-small value">
              timeL {values.delay.timeL} · timeR {values.delay.timeR} · pingPong{' '}
              {String(values.delay.pingPong)}
            </span>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-button">Strips</h2>
        <p className="text-label hint">
          Зажать и вести влево-вправо, клик переносит бегунок. Двойной клик —
          значение по умолчанию, стрелки — мелкий шаг.
        </p>

        <div className="row">
          {[
            ['vibrato', 'rate', 'wave', 'VIBRATO'],
            ['phaser', 'oct', 'bricks', 'PHASER'],
            ['distortion', 'tone', 'gradient', 'DISTORTION']
          ].map(([type, param, variant, title]) => {
            const spec = EFFECTS[type].params[param]
            return (
              <div className="card strip-card" key={type}>
                <span className="text-small card-title">{title}</span>
                <Strip
                  name={capitalize(param)}
                  property={[type, param]}
                  value={values[type][param]}
                  min={spec.min}
                  max={spec.max}
                  defaultValue={spec.default}
                  scale={spec.scale}
                  unit={spec.unit}
                  variant={variant}
                  handleChange={handleChange}
                />
                <span className="text-small value">
                  {param} {+values[type][param].toFixed(3)}
                </span>
              </div>
            )
          })}

          {['lead', 'bass', 'extra'].map((voice) => (
            <div
              className={`card strip-card voice-card voice-${voice}`}
              key={voice}
            >
              <span className="text-small card-title">{voice}</span>
              <Strip
                name="Volume"
                property={['voice', voice]}
                value={values.voice[voice]}
                min={0}
                max={100}
                defaultValue={80}
                variant="volume"
                handleChange={handleChange}
              />
              <span className="text-small value">
                volume {Math.round(values.voice[voice])}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-button">Dropdown</h2>
        <p className="text-label hint">
          Инструмент голоса. Клик или Enter открывает список, стрелки — по
          вариантам, Escape закрывает. На витрине выбор изображает загрузку
          сэмплов (точки), Harp — пример ошибки загрузки.
        </p>

        <div className="row">
          {VOICE_IDS.map((voice) => (
            <div className={`card voice-card voice-${voice}`} key={voice}>
              <span className="text-small card-title">{voice}</span>
              <Dropdown
                name="Instrument"
                property={['instrument', voice]}
                value={values.instrument[voice]}
                options={VOICES[voice].instruments}
                labels={INSTRUMENT_LABELS}
                status={values.status[voice]}
                handleChange={handleInstrument}
              />
              <span className="text-small value">
                {values.instrument[voice]} · {values.status[voice]}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-button">Dot</h2>
        <p className="text-label hint">
          Точки связи голоса: Default — голос подключён, Add link — подключить,
          Delete link — отключить. Ниже — как это работает: клик по большой
          точке переключает связь.
        </p>

        <div className="row">
          <div className="card card-plain">
            <span className="text-small card-title">Kit</span>
            <div className="controls dots">
              {VOICE_IDS.map((voice) => (
                <div className="dot-column" key={voice}>
                  <Dot voice={voice} />
                  <Dot voice={voice} variant="add" />
                  <Dot voice={voice} variant="delete" />
                </div>
              ))}
            </div>
          </div>

          <div className="card card-plain">
            <span className="text-small card-title">Link toggle</span>
            <div className="controls dots">
              {VOICE_IDS.map((voice) => {
                const linked = values.links[voice]
                return (
                  <div className="dot-column" key={voice}>
                    <Dot
                      voice={voice}
                      variant={linked ? 'delete' : 'add'}
                      label={`${linked ? 'Unlink' : 'Link'} ${voice}`}
                      handleClick={() =>
                        handleChange(['links', voice], !linked)
                      }
                    />
                    <span className="text-small value">
                      {linked ? 'linked' : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-button">Button &amp; Icons</h2>
        <p className="text-label hint">
          Четыре типа кнопки из кита и иконки Add, Export, Collapse.
        </p>

        <div className="row">
          <div className="card">
            <span className="text-small card-title">Button</span>
            <div className="buttons">
              <Button icon="add" label="Add" />
              <Button icon="add" text="Next" />
              <Button text="Next" />
              <Button text="Next" hotkey="F" />
            </div>
          </div>

          <div className="card">
            <span className="text-small card-title">Icons</span>
            <div className="controls icons">
              {ICONS.map((name) => (
                <div className="icon-cell" key={name}>
                  <Icon name={name} />
                  <span className="text-small value">{name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <span className="text-small card-title">In use</span>
            <div className="buttons">
              <Button
                icon="collapse"
                label="Collapse panel"
                active={!values.ui.panel}
                handleClick={() =>
                  handleChange(['ui', 'panel'], !values.ui.panel)
                }
              />
              <Button
                icon="export"
                label="Export"
                handleClick={() =>
                  handleChange(['ui', 'clicks'], values.ui.clicks + 1)
                }
              />
              <Button
                icon="add"
                text="Add Effect"
                faint
                handleClick={() =>
                  handleChange(['ui', 'adds'], (values.ui.adds ?? 0) + 1)
                }
              />
            </div>
            <span className="text-small value">
              panel {values.ui.panel ? 'open' : 'closed'} · export clicks{' '}
              {values.ui.clicks} · add clicks {values.ui.adds ?? 0}
            </span>
          </div>
        </div>
      </section>
    </main>
  )
}

document.addEventListener('DOMContentLoaded', () => {
  createRoot(document.getElementById('root')).render(<Showcase />)
})
