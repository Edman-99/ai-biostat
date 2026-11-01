import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/global.css'
import { createServices } from '@/app/container'
import { ServicesProvider } from '@/app/ServicesContext'
import { App } from './App'

const services = createServices()
services.saver.start()

const root = createRoot(document.getElementById('app')!)
// Сначала проверяем сессию — чтобы вошедший пользователь не видел мелькания экрана входа.
void services.session.restore().then(() => root.render(
  <StrictMode>
    <ServicesProvider services={services}><App /></ServicesProvider>
  </StrictMode>,
))
