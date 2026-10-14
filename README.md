# snowflake-synth

Веб-синтезатор начального уровня. Мелодия из трёх голосов играет в цикле, а пользователь «вырезает» из неё свой звук нодами эффектов. Каждый подключённый эффект оставляет вырез на сложенной бумажной снежинке.

Учебный проект курса ADC GID.

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
