import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ru from './locales/ru.json'
import kk from './locales/kk.json'
import en from './locales/en.json'

// Тексты интерфейса — в locales/*.json (удобно отдать на вычитку). Тексты кейсов пока на русском.
let saved: string | null = null
try { saved = localStorage.getItem('aib-lang') } catch { /* приватный режим */ }

void i18n.use(initReactI18next).init({
  resources: { ru: { translation: ru }, kk: { translation: kk }, en: { translation: en } },
  lng: saved || 'ru',
  fallbackLng: 'ru',
  interpolation: { escapeValue: false },
})

// атрибут lang нужен экранным дикторам и правильным переносам слов
i18n.on('languageChanged', lng => { document.documentElement.lang = lng })
document.documentElement.lang = i18n.language

export default i18n
