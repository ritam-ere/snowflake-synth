import React from 'react'

import Dot from '../Dot/Dot.jsx'

// Плашка голоса в состоянии Default: цвет голоса, название 100px
// и точка внизу по центру. Остальные состояния — в вехе M4
export default function VoiceTab({ id }) {
  return (
    <section className={`VoiceTab VoiceTab-${id}`} aria-label={id}>
      <span className="VoiceTab-name text-voice">{id}</span>
      <span className="VoiceTab-dot">
        <Dot voice={id} />
      </span>
    </section>
  )
}
