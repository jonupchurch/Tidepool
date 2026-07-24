// SC-002 leak scan (T018): no storage/OS API is referenced anywhere under src/
// except src/platform. This is the structural guarantee that the seam is the
// only door to persistence — the whole web→desktop wrap depends on it.
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const PLATFORM_DIR = dirname(fileURLToPath(import.meta.url))
const SRC_DIR = dirname(PLATFORM_DIR)

const FORBIDDEN: Array<{ label: string; re: RegExp }> = [
  { label: 'localStorage', re: /\blocalStorage\b/ },
  { label: 'sessionStorage', re: /\bsessionStorage\b/ },
  { label: 'indexedDB', re: /\bindexedDB\b/ },
  { label: '__TAURI__', re: /__TAURI__/ },
  { label: '@tauri-apps', re: /@tauri-apps/ },
]

/** Strip comments so prose mentions (e.g. "don't call localStorage") don't trip. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

function collectSourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (full === PLATFORM_DIR) continue // the seam is allowed to use storage
      if (entry.name === 'test') continue // test harness setup (polyfills)
      out.push(...collectSourceFiles(full))
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

describe('no direct storage/OS access outside src/platform (SC-002)', () => {
  const files = collectSourceFiles(SRC_DIR)

  it('scans a non-trivial number of source files', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  for (const file of files) {
    it(`${relative(SRC_DIR, file)} routes storage only through the seam`, () => {
      const src = stripComments(readFileSync(file, 'utf8'))
      for (const { label, re } of FORBIDDEN) {
        expect(re.test(src), `${relative(SRC_DIR, file)} references ${label}`).toBe(false)
      }
    })
  }
})
