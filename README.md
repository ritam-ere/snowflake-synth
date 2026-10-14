# snowflake-synth

Веб-синтезатор начального уровня. Мелодия из трёх голосов играет в цикле, а пользователь «вырезает» из неё свой звук нодами эффектов. Каждый подключённый эффект оставляет вырез на сложенной бумажной снежинке.

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

Интерфейс набран шрифтом ABC Maxi Round Plus (Dinamo Typefaces, trial-версия по учебному соглашению). Лицензия trial-файла запрещает размещать его на публичных серверах, поэтому шрифта нет в репозитории.

Чтобы увидеть интерфейс как в макете, положи файл `ABCMaxiRoundPlusVariableTrial.ttf` в папку `src/assets/fonts/`. Без файла проект работает и собирается, но текст набирается запасным системным шрифтом.

Служебные страницы:

- http://localhost:3000/tokens — токены и типографика;
- http://localhost:3000/debug — звук без интерфейса;
- http://localhost:3000/components — витрина контролов.

## Материалы и авторы

- **Мелодия** — три MIDI-дорожки автора проекта, записаны в BandLab: `src/data/midi/`.
- **Сэмплы инструментов** — Fluid Soundfont из [midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts), лицензия [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/us/): `src/assets/samples/` (подробности в `ATTRIBUTION.md`).
- **Шрифт** — ABC Maxi Round Plus, Dinamo Typefaces (trial, учебное соглашение).

## Структура

```
src/
  core/         ядро: состояние, редьюсер, правила снежинки (без React и Tone)
  audio/        звуковой движок на Tone.js
  components/   React-компоненты интерфейса
  data/         MIDI, пресеты инструментов и эффектов
  stylesheets/  токены и базовые стили
  assets/       шрифты, сэмплы
```

Зависимости направлены к ядру: интерфейс и звук читают состояние из `core/`, но не обращаются друг к другу напрямую.
