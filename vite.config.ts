import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages для репозитория DimsKotov/Deadline-handler:
  // https://dimskotov.github.io/Deadline-handler/
  base: "/Deadline-handler/",
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    proxy: {
      // Прокси снимает CORS при запросах к Google Sheets из браузера (в dev-режиме).
      // Используется только для локальной разработки.
      "/google-sheets": {
        target: "https://docs.google.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/google-sheets/, ""),
      },
      // Когда app загружена с base="/Deadline-handler/", фронтенд может обращаться
      // к "/Deadline-handler/google-sheets/...". Добавляем второй матч.
      "/Deadline-handler/google-sheets": {
        target: "https://docs.google.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) =>
          path.replace(/^\/Deadline-handler\/google-sheets/, "/google-sheets"),
      },
    },
  },
})
