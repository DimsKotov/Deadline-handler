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
})
