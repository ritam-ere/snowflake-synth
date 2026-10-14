// Удобства одного зрителя, которые помнит браузер (localStorage).
// Хранилище может быть недоступно (приватное окно, запрет сайта),
// поэтому любые ошибки молча игнорируются — экран работает и без него

const PANEL_KEY = 'snowflake-synth:panel-open'

export function loadPanelOpen() {
  try {
    const value = window.localStorage.getItem(PANEL_KEY)
    return value === null ? true : value === 'true'
  } catch {
    return true
  }
}

export function savePanelOpen(open) {
  try {
    window.localStorage.setItem(PANEL_KEY, String(open))
  } catch {
    // без хранилища панель просто откроется в следующий раз
  }
}
