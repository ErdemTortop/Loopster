import { alphaTab } from '@coderline/alphatab-vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths work both under the desktop shell's app:// origin and on a GitHub Pages subpath.
  base: './',
  plugins: [react(), tailwindcss(), alphaTab()],
})
