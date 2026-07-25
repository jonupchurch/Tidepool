import pkg from '../../../package.json'
import { COPYRIGHT_YEAR, CREDIT, STUDIO, VERSION } from './about'

describe('about constants', () => {
  it('reads as the credit line the game ships with', () => {
    expect(CREDIT).toBe('A game by Gravytraining, copyright 2026')
  })

  it('builds the credit from its parts, so a rename lands everywhere', () => {
    expect(CREDIT).toContain(STUDIO)
    expect(CREDIT).toContain(String(COPYRIGHT_YEAR))
  })

  it('states a version', () => {
    expect(VERSION).toMatch(/^\d+\.\d+$/)
  })

  // Two places record a version; they must not drift. package.json carries the
  // full semver, the screen shows major.minor.
  it('agrees with package.json', () => {
    const [major, minor] = pkg.version.split('.')
    expect(`${major}.${minor}`).toBe(VERSION)
  })

  // A copyright year that follows the clock would change the build from one day
  // to the next. It's a constant on purpose.
  it('pins the copyright year rather than reading the clock', () => {
    expect(COPYRIGHT_YEAR).toBe(2026)
  })
})
