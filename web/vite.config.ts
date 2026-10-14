import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    // The back end serves /listings, /me and so on without an /api prefix (backend/openapi.yaml).
    // Set API_STRIP_PREFIX=false in web/.env once it moves to /api (docs/API.md).
    server: {
      // In development the app calls "/api" on its own address and Vite forwards it to the
      // back end. That way the login cookie works without any CORS setup.
      proxy: {
        '/api': {
          target: env.API_PROXY_TARGET || 'http://localhost:3000',
          changeOrigin: true,
          ...(env.API_STRIP_PREFIX === 'false' ? {} : { rewrite: (path: string) => path.replace(/^\/api/, '') }),
        },
      },
    },
  }
})
