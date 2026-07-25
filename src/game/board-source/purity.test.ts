// Purity guard (T002): board-source must never reach for ambient randomness, the
// wall-clock, or the DOM — all determinism lives in the engine (Principle XI),
// and all persistence goes through the injected SaveStore (008), not localStorage.
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const DIR = dirname(fileURLToPath(import.meta.url))

/** Strip comments so mentions in prose don't trip the scan. */
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

function sourceFiles(): string[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.ts'))
    .filter((f) => !f.endsWith('.test.ts'))
    .filter((f) => f !== 'test-helpers.ts')
}

describe('board-source purity', () => {
  const files = sourceFiles()

  it('scans the board-source files', () => {
    expect(files.length).toBeGreaterThanOrEqual(4)
  })

  for (const file of files) {
    it(`${file} uses no ambient randomness / wall-clock / DOM / localStorage`, () => {
      const src = stripComments(readFileSync(join(DIR, file), 'utf8'))
      for (const { label, re } of FORBIDDEN) {
        expect(re.test(src), `${file} must not use ${label}`).toBe(false)
      }
    })
  }
})
