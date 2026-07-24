// Purity guard (T002): core/ must never reach for ambient randomness, the
// wall-clock, or the DOM — determinism is the load-bearing invariant (XI).
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const CORE_DIR = dirname(fileURLToPath(import.meta.url))

/** Strip line and block comments so mentions in prose don't trip the scan. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

const FORBIDDEN: Array<{ label: string; re: RegExp }> = [
  { label: 'Math.random', re: /\bMath\s*\.\s*random\b/ },
  { label: 'Date.now', re: /\bDate\s*\.\s*now\b/ },
  { label: 'new Date', re: /\bnew\s+Date\b/ },
  { label: 'document', re: /\bdocument\b/ },
  { label: 'window', re: /\bwindow\b/ },
  { label: 'localStorage', re: /\blocalStorage\b/ },
  { label: 'performance.now', re: /\bperformance\s*\.\s*now\b/ },
]

function coreSourceFiles(): string[] {
  return readdirSync(CORE_DIR)
    .filter((f) => f.endsWith('.ts'))
    .filter((f) => !f.endsWith('.test.ts'))
    .filter((f) => f !== 'test-helpers.ts')
}

describe('core purity', () => {
  const files = coreSourceFiles()

  it('scans a non-trivial number of core files', () => {
    expect(files.length).toBeGreaterThanOrEqual(8)
  })

  for (const file of files) {
    it(`${file} uses no ambient randomness / wall-clock / DOM`, () => {
      const src = stripComments(readFileSync(join(CORE_DIR, file), 'utf8'))
      for (const { label, re } of FORBIDDEN) {
        expect(re.test(src), `${file} references ${label}`).toBe(false)
      }
    })
  }
})
