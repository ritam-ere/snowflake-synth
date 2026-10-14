import { join, normalize } from 'node:path'

import index from './src/index.html'
import tokens from './src/tokens.html'
import debug from './src/debug.html'

const SAMPLES_DIR = './src/assets/samples'

// Сэмплы отдаются статикой: инструмент загружает их только при выборе
async function serveSample(req) {
  const name = decodeURIComponent(new URL(req.url).pathname).replace(
    /^\/samples\//,
    ''
  )
  const path = normalize(join(SAMPLES_DIR, name))

  if (!path.startsWith(normalize(SAMPLES_DIR))) {
    return new Response('Forbidden', { status: 403 })
  }

  const file = Bun.file(path)
  return (await file.exists())
    ? new Response(file)
    : new Response('Not found', { status: 404 })
}

// Dev-сервер: Bun сам собирает HTML, JSX и CSS «на лету»
const server = Bun.serve({
  port: 3000,
  development: true,
  routes: {
    '/': index,
    '/tokens': tokens,
    '/debug': debug,
    '/samples/*': serveSample
  }
})

console.log(`Snowflake Synth: ${server.url}`)
console.log(`Токены: ${server.url}tokens`)
console.log(`Debug: ${server.url}debug`)
