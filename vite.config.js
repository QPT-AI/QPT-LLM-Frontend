import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const CREDITS_PATH = fileURLToPath(new URL('./CREDITS', import.meta.url))
const TEAM_ID = 'virtual:team'
const RESOLVED_TEAM_ID = '\0' + TEAM_ID

// Parse CREDITS at build time and expose only the public fields
// (name, role, website) so emails / addresses never reach the bundle.
function parseCredits(raw) {
  const body = raw.split(/^-{4,}\s*$/m)[1] ?? ''
  return body
    .split(/\n\s*\n/)
    .map((block) => {
      const fields = {}
      for (const line of block.split('\n')) {
        const m = line.match(/^([A-Z]):\s*(.*?)\s*$/)
        if (m && !(m[1] in fields)) fields[m[1]] = m[2]
      }
      return { name: fields.N, role: fields.D || '', website: fields.W || null }
    })
    .filter((p) => p.name)
}

function creditsPlugin() {
  return {
    name: 'qpt-credits',
    resolveId(id) {
      if (id === TEAM_ID) return RESOLVED_TEAM_ID
    },
    load(id) {
      if (id !== RESOLVED_TEAM_ID) return
      this.addWatchFile(CREDITS_PATH)
      const team = parseCredits(readFileSync(CREDITS_PATH, 'utf8'))
      return `export default ${JSON.stringify(team)};`
    },
  }
}

// Content-Security-Policy for the built site. Injected only at build time:
// the dev server relies on an inline React Refresh preamble this would block.
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://cloud.umami.is https://www.googletagmanager.com https://accounts.google.com/gsi/client",
  "connect-src 'self' http://localhost:9600 ws://localhost:9600 https://cloud.umami.is https://api-gateway.umami.dev https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://accounts.google.com/gsi/",
  "img-src 'self' data: blob: https://*.google-analytics.com https://*.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style",
  "font-src 'self' https://fonts.gstatic.com",
  "frame-src https://accounts.google.com/gsi/",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

function cspPlugin() {
  return {
    name: 'qpt-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        /<meta charset="UTF-8" \/>/,
        (m) => `${m}\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), creditsPlugin(), cspPlugin()],

  // Lower newer syntax (e.g. class static blocks in three.js) for older iOS Safari
  build: {
    target: ['es2020', 'safari15', 'ios15', 'chrome100', 'firefox100', 'edge100'],
  },

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
