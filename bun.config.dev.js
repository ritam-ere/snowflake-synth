import index from './src/index.html'
import tokens from './src/tokens.html'

// Dev-сервер: Bun сам собирает HTML, JSX и CSS «на лету»
const server = Bun.serve({
  port: 3000,
  development: true,
  routes: {
    '/': index,
    '/tokens': tokens
  }
})

console.log(`Snowflake Synth: ${server.url}`)
console.log(`Токены: ${server.url}tokens`)
