// Portability guard (T002): src/game/ is pure play logic — no DOM, no React, no
// storage. It must stay runnable in Node and a worker (mirrors core/purity).
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const GAME_DIR = dirname(fileURLToPath(import.meta.url))

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

const FORBIDDEN: Array<{ label: string; re: RegExp }> = [
  { label: 'window', re: /\bwindow\b/ },
  { label: 'document', re: /\bdocument\b/ },
  { label: 'localStorage', re: /\blocalStorage\b/ },
  { label: "import from 'react'", re: /from\s+['"]react['"]/ },
  { label: 'Math.random', re: /\bMath\s*\.\s*random\b/ },
]

function gameSourceFiles(): string[] {
  return readdirSync(GAME_DIR)
    .filter((f) => f.endsWith('.ts'))
    .filter((f) => !f.endsWith('.test.ts'))
    .filter((f) => f !== 'test-helpers.ts')
}

describe('game purity', () => {
  const files = gameSourceFiles()

  it('scans the game source files', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  for (const file of files) {
    it(`${file} is DOM-free, React-free, storage-free`, () => {
      const src = stripComments(readFileSync(join(GAME_DIR, file), 'utf8'))
      for (const { label, re } of FORBIDDEN) {
        expect(re.test(src), `${file} references ${label}`).toBe(false)
      }
    })
  }
})
