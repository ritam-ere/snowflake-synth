# Сэмплы инструментов

Сэмплы взяты из [midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts) (Benjamin Gleitzman), набор **Fluid Soundfont**. Он сгенерирован из FluidR3_GM.sf2 и распространяется по лицензии [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/us/).

| Папка | Инструмент General MIDI | Ноты | Голос |
| --- | --- | --- | --- |
| `church-organ/` | church_organ | Gb1, A1, C2, Eb2, Gb2, A2, C3 | bass (F1–C3) |
| `electric-piano/` | electric_piano_1 | Eb3, Gb3, A3, C4, Eb4, Gb4 | lead (D3–F4) |

Ноты взяты с шагом в малую терцию, чтобы покрыть диапазон голоса. Промежуточные ноты `Tone.Sampler` получает транспонированием. Длительность каждого файла около 3,2 с, формат mp3 128 kbps.

Голос extra (FM keys) синтезируется `Tone.FMSynth` и сэмплов не требует.
