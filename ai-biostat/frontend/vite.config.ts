import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Сборка кладётся в ../static — сервер (FastAPI) отдаёт её как раньше:
// index.html по адресу "/", остальные файлы по "/static/...".
export default defineConfig({
  plugins: [react()],
  base: '/static/',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { outDir: '../static', emptyOutDir: true },
  server: { proxy: { '/api': 'http://127.0.0.1:8000' } },
  test: { environment: 'node' },
})
