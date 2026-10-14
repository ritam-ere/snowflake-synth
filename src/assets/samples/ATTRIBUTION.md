# Сэмплы инструментов

Сэмплы взяты из [midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts) (Benjamin Gleitzman), набор **Fluid Soundfont**. Он сгенерирован из FluidR3_GM.sf2 и распространяется по лицензии [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/us/).

| Папка | Инструмент General MIDI | Ноты | Голос |
| --- | --- | --- | --- |
| `electric-piano/` | electric_piano_1 | Eb3, Gb3, A3, C4, Eb4, Gb4 | lead: Whirly (D3–F4) |
| `celesta/` | celesta | Eb3, Gb3, A3, C4, Eb4, Gb4 | lead: Celesta |
| `music-box/` | music_box | Eb3, Gb3, A3, C4, Eb4, Gb4 | lead: Music box |
| `vibraphone/` | vibraphone | Eb3, Gb3, A3, C4, Eb4, Gb4 | lead: Vibraphone |
| `church-organ/` | church_organ | Gb1, A1, C2, Eb2, Gb2, A2, C3 | bass: Church organ (F1–C3) |
| `warm-pad/` | pad_2_warm | Gb1, A1, C2, Eb2, Gb2, A2, C3 | bass: Warm pad |
| `harp/` | orchestral_harp | Gb1, A1, C2, Eb2, Gb2, A2, C3 | bass: Harp |
| `fm-piano/` | electric_piano_2 | Eb4, Gb4, A4, C5, Eb5, Gb5 | extra: FM piano (D4–F5) |
| `glockenspiel/` | glockenspiel | Eb4, Gb4, A4, C5, Eb5, Gb5 | extra: Glockenspiel |
| `kalimba/` | kalimba | Eb4, Gb4, A4, C5, Eb5, Gb5 | extra: Kalimba |

Ноты взяты с шагом в малую терцию, чтобы покрыть диапазон голоса. Промежуточные ноты `Tone.Sampler` получает транспонированием. Длительность каждого файла около 3,2 с, формат mp3 128 kbps.

Два инструмента синтезируются и сэмплов не требуют: FM keys (`Tone.FMSynth`, голос extra) и Soft sine (`Tone.Synth`, голос bass).

Сэмплы лежат статикой и загружаются только когда инструмент выбран, поэтому стартовая загрузка не растёт от числа инструментов.
