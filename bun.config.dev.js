import index from './src/index.html'

// Dev-сервер: Bun сам собирает HTML, JSX и CSS «на лету»
const server = Bun.serve({
  port: 3000,
  development: true,
  routes: {
    '/': index
  }
})

console.log(`Snowflake Synth: ${server.url}`)
