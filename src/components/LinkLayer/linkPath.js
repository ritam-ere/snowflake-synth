// Кривая связи от точки голоса к курсору или лампочке ноды.
// Плавная S-кривая: из точки голоса уходит вниз, к цели подходит сверху.
// Чистая функция — проверяется тестом

export function linkPath(from, to) {
  const dy = Math.max(40, Math.abs(to.y - from.y) / 2)
  return (
    `M ${from.x} ${from.y} ` +
    `C ${from.x} ${from.y + dy}, ${to.x} ${to.y - dy}, ${to.x} ${to.y}`
  )
}
