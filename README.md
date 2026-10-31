# snowflake-synth

Веб-синтезатор начального уровня. Мелодия из трёх голосов играет в цикле, а пользователь меняет её звук нодами эффектов. Каждая сыгранная нота выпускает пиксельную снежинку, а эффекты меняют её вид и полёт — снег идёт в такт музыке.

Учебный проект курса ADC GID.

Сайт: https://ritam-ere.github.io/snowflake-synth/ (обновляется автоматически после каждого мержа в `main`)

## Стек

- [Bun](https://bun.sh): dev-сервер, сборка, тесты
- React 19
- [Tone.js](https://tonejs.github.io): звук
- [@tonejs/midi](https://github.com/Tonejs/Midi): чтение MIDI-дорожек

## Установка Bun

```bash
curl -fsSL https://bun.sh/install | bash
```

## Запуск

```bash
bun install      # зависимости
bun run dev      # dev-сервер на http://localhost:3000
bun run build    # продакшен-сборка в dist/
bun test         # юнит-тесты
bun run format   # форматирование Prettier
```

## Шрифт

Интерфейс набран шрифтом ABC Maxi Round Plus (Dinamo Typefaces). Файл лежит в `src/assets/fonts/` и публикуется вместе с сайтом по учебному соглашению университета с Dinamo.

Служебные страницы:

- http://localhost:3000/tokens — токены и типографика;
- http://localhost:3000/debug — звук без интерфейса;
- http://localhost:3000/components — витрина контролов.

## Материалы и авторы

- **Мелодия** — три MIDI-дорожки автора проекта, записаны в BandLab: `src/data/midi/`.
- **Сэмплы инструментов** — Fluid Soundfont из [midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts), лицензия [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/us/): `src/assets/samples/` (подробности в `ATTRIBUTION.md`).
- **Шрифт** — ABC Maxi Round Plus, Dinamo Typefaces (по учебному соглашению университета).

## Структура

```
src/
  core/         ядро: состояние, редьюсер, правила снегопада (без React и Tone)
  audio/        звуковой движок на Tone.js
  components/   React-компоненты интерфейса
  data/         MIDI, пресеты инструментов и эффектов
  stylesheets/  токены и базовые стили
  assets/       шрифты, сэмплы
```

Зависимости направлены к ядру: интерфейс и звук читают состояние из `core/`, но не обращаются друг к другу напрямую.
