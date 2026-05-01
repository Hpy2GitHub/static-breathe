import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Change '/breathing-app/' to match your GitHub repository name
// e.g. if your repo is github.com/yourname/my-app, set base to '/my-app/'
export default defineConfig({
  plugins: [react()],
  base: '/breathing-app/',
})
