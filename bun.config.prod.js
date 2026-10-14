import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

// Шрифт с trial-лицензией не хранится в репозитории (см. README).
// Если файла нет, ссылка на него остаётся как есть, и браузер берёт запасной шрифт
const optionalFontsPlugin = {
  name: 'optional-fonts',
  setup(build) {
    build.onResolve({ filter: /\.(ttf|otf|woff2?)$/ }, (args) => {
      const fullPath = resolve(dirname(args.importer), args.path)

      if (!existsSync(fullPath)) {
        console.warn(`Шрифт не найден, будет запасной: ${args.path}`)
        return { path: args.path, external: true }
      }
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
  plugins: [optionalFontsPlugin]
})

if (!result.success) {
  result.logs.forEach((log) => console.error(log))
  process.exit(1)
}

console.log(`Собрано файлов: ${result.outputs.length}`)
