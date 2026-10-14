// Продакшен-сборка в dist/ для GitHub Pages
const result = await Bun.build({
  entrypoints: ['./src/index.html'],
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

console.log(`Собрано файлов: ${result.outputs.length}`)
