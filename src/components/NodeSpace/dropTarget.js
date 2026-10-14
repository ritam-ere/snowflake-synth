// Куда положить перетаскиваемую ноду (задача 5.2). Чистая функция:
// на вход — геометрия колонок и карточек, на выход — { column, index }
// для MOVE_NODE. Проверяется тестами.
//
// columns: [{ left, right, cards: [{ id, top, bottom }] }]
// Колонка — та, над которой указатель (или ближайшая по горизонтали).
// Индекс — сколько карточек этой колонки (кроме перетаскиваемой)
// стоят выше указателя по своей середине.

export function dropTarget(columns, draggedId, x, y) {
  let column = 0
  let best = Infinity

  columns.forEach((c, i) => {
    const distance = x < c.left ? c.left - x : x > c.right ? x - c.right : 0
    if (distance < best) {
      best = distance
      column = i
    }
  })

  const index = columns[column].cards
    .filter((card) => card.id !== draggedId)
    .filter((card) => (card.top + card.bottom) / 2 < y).length

  return { column, index }
}
