import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'qrcode.react',
      'react-router-dom',
      'leaflet',
      'react-leaflet',
      'jspdf',
      'gsap',
      '@gsap/react',
      'react-quill-new'
    ]
  },
  server: {
    port: 5180,
    strictPort: true,
    host: true,
    allowedHosts: ['localhost', 'admin.localhost', 'member.localhost'],
    proxy: {
      '/paycools-proxy': {
        target: 'https://api-uat.paycools.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/paycools-proxy/, ''),
      },
      '/api/paycools': {
        target: 'https://paycoolsapi-o2ae3rho5q-uc.a.run.app',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/paycools/, ''),
      },
    },
  },
})
