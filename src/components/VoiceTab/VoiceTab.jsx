import React from 'react'

import { INSTRUMENT_LABELS, VOICES } from '../../core/voices.js'
import Dot from '../Dot/Dot.jsx'
import Dropdown from '../Dropdown/Dropdown.jsx'
import Knob from '../Knob/Knob.jsx'
import Strip from '../Strip/Strip.jsx'

// Плашка голоса (Voice tab из кита), состояния:
//   Default    — цвет голоса, название, точка внизу;
//   Hover верх — верх темнее, нижняя полоса 32px остаётся цветом голоса;
//   Hover низ  — нижняя полоса темнее, точка становится «+» (отсюда
//                тянется связь к ноде — задача 4.3);
//   Open       — клик по верху: Channel, Instrument, Volume.
// Открыта может быть только одна плашка; Esc закрывает (см. App).

export default function VoiceTab({
  id,
  settings,
  open,
  status,
  handleChange,
  handleOpen
}) {
  const property = (key) => ['voices', id, key]
  const classes = ['VoiceTab', `VoiceTab-${id}`]
  if (open) classes.push('is-open')

  return (
    <section className={classes.join(' ')} aria-label={id}>
      {/* Верхняя зона: в закрытой плашке — название и клик «открыть»,
          в открытой — подложка под контролами, клик по пустому месту закрывает */}
      <button
        type="button"
        className="VoiceTab-upper"
        aria-expanded={open}
        aria-label={open ? `Close ${id}` : `Open ${id}`}
        onClick={() => handleOpen(open ? null : id)}
      >
        <span className="VoiceTab-name text-voice">{id}</span>
      </button>

      {open && (
        <div className="VoiceTab-controls">
          <Knob
            name="Channel"
            property={property('pan')}
            value={settings.pan}
            min={-1}
            max={1}
            defaultValue={VOICES[id].defaults.pan}
            unit="pan"
            handleChange={handleChange}
          />
          <div className="VoiceTab-column">
            <Dropdown
              name="Instrument"
              property={property('instrument')}
              value={settings.instrument}
              options={VOICES[id].instruments}
              labels={INSTRUMENT_LABELS}
              status={status}
              handleChange={handleChange}
            />
            <Strip
              name="Volume"
              property={property('volume')}
              value={settings.volume}
              min={0}
              max={100}
              defaultValue={VOICES[id].defaults.volume}
              unit="vol"
              variant="volume"
              handleChange={handleChange}
            />
          </div>
        </div>
      )}

      {/* Нижняя зона 32px: отсюда тянется связь к ноде (задача 4.3) */}
      <div className="VoiceTab-bottom">
        <span className="VoiceTab-dot">
          <span className="VoiceTab-dot-default">
            <Dot voice={id} />
          </span>
          <span className="VoiceTab-dot-add">
            <Dot voice={id} variant="add" />
          </span>
        </span>
      </div>
    </section>
  )
}
