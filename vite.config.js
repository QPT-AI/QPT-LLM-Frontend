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

export default defineConfig({
  plugins: [react(), creditsPlugin()],

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
