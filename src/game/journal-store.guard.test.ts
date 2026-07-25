// Guard (T003): the journal must persist ONLY through the injected SaveStore —
// never localStorage / IndexedDB / window directly. Complements game/purity.test
// with an explicit journal-scoped scan that also forbids `indexedDB`.
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const GAME_DIR = dirname(fileURLToPath(import.meta.url))
const UI_DIR = join(GAME_DIR, '..', 'ui', 'journal')

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

const FORBIDDEN: Array<{ label: string; re: RegExp }> = [
  { label: 'localStorage', re: /\blocalStorage\b/ },
  { label: 'sessionStorage', re: /\bsessionStorage\b/ },
  { label: 'indexedDB', re: /\bindexedDB\b/i },
]

// UI files are scanned once they land (US1); the model files always exist.
const FILES = [
  join(GAME_DIR, 'journal.ts'),
  join(GAME_DIR, 'journal-store.ts'),
  join(UI_DIR, 'JournalScreen.tsx'),
  join(UI_DIR, 'CreatureCard.tsx'),
  join(UI_DIR, 'StatsFooter.tsx'),
].filter((f) => existsSync(f))

describe('journal persists only through SaveStore', () => {
  for (const file of FILES) {
    it(`${file.split(/[\\/]/).pop()} touches no storage API directly`, () => {
      const src = stripComments(readFileSync(file, 'utf8'))
      for (const { label, re } of FORBIDDEN) {
        expect(re.test(src), `references ${label}`).toBe(false)
      }
    })
  }
})
