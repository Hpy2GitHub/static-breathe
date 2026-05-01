import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const isGithub = mode === 'github'
  const isApache = mode === 'apache'

  const base = isGithub
    ? '/static-breathe/'  // https://hpy2github.github.io/static-breathe/
    : isApache
    ? '/sandbox/breathe/' // http://localhost/sandbox/breathe/
    : '/'                 // npm dev server

  return {
    base,
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/cgi-bin': {
          target: 'http://localhost:80',
          changeOrigin: true,
        },
      },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['android-chrome-192x192.png', 'android-chrome-512x512.png', 'apple-touch-icon.png', 'favicon-16x16.png', 'favicon-32x32.png', 'favicon.ico', 'favicon.svg', 'icons.svg'],
        manifest: {
          name: 'Breathe',
          short_name: 'Breathe',
         description: 'Slow your breathing',
          theme_color: '#080d1a',
          background_color: '#080d1a',
          display: 'standalone',
          scope: base,      // ← set correctly per mode
          start_url: base,  // ← set correctly per mode
          icons: [
            { src: 'android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          globIgnores: [],
          navigateFallback: 'index.html',
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        },
      }),
    ],
    optimizeDeps: {
      include: [],
    },
  }
})
