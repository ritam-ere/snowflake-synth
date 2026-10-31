import { cpSync } from 'node:fs'

// Продакшен-сборка в dist/ для GitHub Pages
const result = await Bun.build({
  entrypoints: [
    './src/index.html',
    './src/tokens.html',
    './src/debug.html',
    './src/components.html'
  ],
  outdir: './dist',
  minify: true,
  target: 'browser',
  // Относительные пути: сайт живёт в подпапке /snowflake-synth/ на Pages
  publicPath: './'
})

if (!result.success) {
  result.logs.forEach((log) => console.error(log))
  process.exit(1)
}

// Сэмплы инструментов — статикой, загружаются только при выборе инструмента
cpSync('./src/assets/samples', './dist/samples', { recursive: true })

console.log(`Собрано файлов: ${result.outputs.length}, сэмплы скопированы`)
