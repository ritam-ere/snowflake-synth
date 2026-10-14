import index from './src/index.html'
import tokens from './src/tokens.html'
import debug from './src/debug.html'

// Dev-сервер: Bun сам собирает HTML, JSX и CSS «на лету»
const server = Bun.serve({
  port: 3000,
  development: true,
  routes: {
    '/': index,
    '/tokens': tokens,
    '/debug': debug
  }
})

console.log(`Snowflake Synth: ${server.url}`)
console.log(`Токены: ${server.url}tokens`)
console.log(`Debug: ${server.url}debug`)
