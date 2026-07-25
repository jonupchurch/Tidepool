// tokens.guard.test.ts — design-system guardrail: shell components must style
// with Tailwind theme tokens (bg-sand, text-deep-pool, font-display, …), never
// hardcoded hex colors. Keeps Night Tide's palette owned in one place (006).
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const dir = join(process.cwd(), 'src', 'ui', 'shell')
const HEX = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/

describe('shell design-token guard', () => {
  const files = readdirSync(dir).filter(
    (f) => f.endsWith('.tsx') && !f.includes('.test.') && !f.includes('test-helpers'),
  )

  it('covers every shell component', () => {
    // AppShell, HomeScreen, SplashScreen, PauseOverlay, ResumeCard.
    expect(files.length).toBeGreaterThanOrEqual(5)
  })

  for (const file of files) {
    it(`${file} uses theme tokens, not hardcoded hex`, () => {
      const src = readFileSync(join(dir, file), 'utf8')
      const offenders = src.split('\n').filter((line) => HEX.test(line))
      expect(offenders, `hardcoded hex in ${file}:\n${offenders.join('\n')}`).toEqual([])
    })
  }
})
