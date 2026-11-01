export const APP_VERSION = __APP_VERSION__

/** Время сборки по-местному, например «01.11.2026, 21:05». */
export const BUILD_TIME = new Date(__BUILD_TIME__).toLocaleString('ru-RU', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
})
