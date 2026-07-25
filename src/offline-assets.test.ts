// A Steam/desktop build has to render correctly with the network unplugged
// (009 FR-006 / SC-004). The failure mode this guards is quiet and easy to
// reintroduce: pasting a Google Fonts <link> back into index.html looks fine on
// a dev machine and only shows up as fallback type on a player's offline box.
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Anchored on the repo root (vitest's cwd), asserted below so a future runner
// with a different cwd fails loudly rather than silently reading nothing.
const root = (p: string) => resolve(process.cwd(), p)
const read = (p: string) => readFileSync(root(p), 'utf8')

/** Fonts referenced by @font-face in the stylesheet. */
const FONT_FILES = [
  'src/assets/fonts/bricolage-grotesque-latin.woff2',
  'src/assets/fonts/bricolage-grotesque-latin-ext.woff2',
  'src/assets/fonts/nunito-latin.woff2',
  'src/assets/fonts/nunito-latin-ext.woff2',
]

describe('offline assets', () => {
  it('is reading the real repo (guards the cwd assumption)', () => {
    expect(existsSync(root('package.json'))).toBe(true)
    expect(existsSync(root('index.html'))).toBe(true)
  })

  it('the page requests nothing from the network', () => {
    const html = read('index.html')
    expect(html).not.toMatch(/https?:\/\//)
  })

  it('the stylesheet loads no remote fonts', () => {
    const css = read('src/index.css')
    expect(css).not.toMatch(/url\(\s*["']?https?:/)
    expect(css).not.toContain('fonts.googleapis.com')
    expect(css).not.toContain('fonts.gstatic.com')
  })

  it('every font the stylesheet asks for is present', () => {
    const css = read('src/index.css')
    for (const file of FONT_FILES) {
      // The @font-face src is relative to src/index.css.
      expect(css).toContain(file.replace('src/', './'))
      expect(existsSync(root(file)), `${file} is missing`).toBe(true)
    }
  })

  it('ships the font licences it is required to redistribute', () => {
    // Both families are SIL OFL 1.1: bundling is allowed, dropping the licence
    // text is not.
    for (const licence of ['OFL-Bricolage-Grotesque.txt', 'OFL-Nunito.txt']) {
      const text = read(`src/assets/fonts/${licence}`)
      expect(text).toContain('SIL Open Font License')
    }
  })

  it('covers both families the design tokens name', () => {
    const css = read('src/index.css')
    expect(css).toContain('font-family: "Bricolage Grotesque"')
    expect(css).toContain('font-family: "Nunito"')
  })
})
