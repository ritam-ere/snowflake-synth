import React from 'react'

import { INSTRUMENT_LABELS, VOICES } from '../../core/voices.js'
import Dot from '../Dot/Dot.jsx'
import Dropdown from '../Dropdown/Dropdown.jsx'
import Knob from '../Knob/Knob.jsx'
import Strip from '../Strip/Strip.jsx'

// Плашка голоса (Voice tab из кита), состояния:
//   Default    — цвет голоса, название, точка внизу;
//   Hover верх — верх темнее, нижняя полоса 32px остаётся цветом голоса;
//   Hover низ  — нижняя полоса темнее, точка становится «+»: отсюда
//                тянется связь к ноде (useLinkDrag);
//   Open       — клик по верху: Channel, Instrument, Volume.
// Открыта может быть только одна плашка; Esc закрывает (см. App).

// Буква в центре кноба Channel: L — левее, M — середина, R — правее
function panLetter(pan) {
  if (Math.abs(pan) < 0.005) return 'M'
  return pan < 0 ? 'L' : 'R'
}

export default function VoiceTab({
  id,
  settings,
  open,
  status,
  handleChange,
  handleOpen,
  handleLinkStart,
  linking = false
}) {
  const property = (key) => ['voices', id, key]
  const classes = ['VoiceTab', `VoiceTab-${id}`]
  if (open) classes.push('is-open')
  if (linking) classes.push('is-linking')

  return (
    <section className={classes.join(' ')} aria-label={id} data-voice-tab={id}>
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
            defaultValue={0}
            unit="pan"
            center={panLetter}
            detent
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

      {/* Нижняя зона 32px: зажать и тянуть к ноде — связь голоса с эффектом */}
      <div
        className="VoiceTab-bottom"
        title="Drag to an effect"
        onPointerDown={(event) => handleLinkStart(id, event)}
      >
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
