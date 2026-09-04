import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    host: '0.0.0.0',
    allowedHosts: [
      'wkyxxvbfrt.a.pinggy.link',
      '.pinggy.link',
      'www.qpt-ai.com',
      'qpt-ai.com',
    ],
  },
})
