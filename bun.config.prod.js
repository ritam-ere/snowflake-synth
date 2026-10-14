import { existsSync } from 'node:fs'

const FONT_PATH = './src/assets/fonts/ABCMaxiRoundPlusVariableTrial.ttf'

// Шрифт с trial-лицензией не хранится в репозитории (см. README).
// Если файла нет, fonts.css собирается пустым, и браузер сразу берёт запасной шрифт
const optionalFontPlugin = {
  name: 'optional-font',
  setup(build) {
    build.onLoad({ filter: /fonts\.css$/ }, async (args) => {
      if (existsSync(FONT_PATH)) {
        return { contents: await Bun.file(args.path).text(), loader: 'css' }
      }

      console.warn('Шрифт не найден, сборка с запасным шрифтом')
      return { contents: '', loader: 'css' }
    })
  }
}

// Продакшен-сборка в dist/ для GitHub Pages
const result = await Bun.build({
  entrypoints: ['./src/index.html', './src/tokens.html'],
  outdir: './dist',
  minify: true,
  target: 'browser',
  // Относительные пути: сайт живёт в подпапке /snowflake-synth/ на Pages
  publicPath: './',
  plugins: [optionalFontPlugin]
})

if (!result.success) {
  result.logs.forEach((log) => console.error(log))
  process.exit(1)
}

console.log(`Собрано файлов: ${result.outputs.length}`)
