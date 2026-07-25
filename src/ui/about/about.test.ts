import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import pkg from '../../../package.json'
import { COPYRIGHT_YEAR, CREDIT, STUDIO, VERSION } from './about'

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8')

describe('about constants', () => {
  it('reads as the credit line the game ships with', () => {
    expect(CREDIT).toBe('A game by Gravytraining, copyright 2026')
  })

  it('builds the credit from its parts, so a rename lands everywhere', () => {
    expect(CREDIT).toContain(STUDIO)
    expect(CREDIT).toContain(String(COPYRIGHT_YEAR))
  })

  it('states a version', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })

  // Two places record a version; they must not drift. Both carry the full
  // semver, so this is an exact match rather than a prefix comparison — the
  // latter would quietly accept 1.1 against 1.10.
  it('agrees with package.json', () => {
    expect(pkg.version).toBe(VERSION)
  })

  // A copyright year that follows the clock would change the build from one day
  // to the next. It's a constant on purpose.
  it('pins the copyright year rather than reading the clock', () => {
    expect(COPYRIGHT_YEAR).toBe(2026)
  })
})

// Four files now state a version, and three of them are invisible while you
// play: an installer that says 0.1.0 while the About screen says 1.0.1 is the
// kind of thing that ships unnoticed and then confuses a bug report.
describe('version parity across the desktop build', () => {
  it('the Tauri bundle version matches', () => {
    const conf = JSON.parse(read('src-tauri/tauri.conf.json')) as { version: string }
    expect(conf.version).toBe(VERSION)
  })

  it('the Rust crate version matches', () => {
    // First `version = "..."` in the file is the [package] one.
    const found = read('src-tauri/Cargo.toml').match(/^version\s*=\s*"([^"]+)"/m)
    expect(found?.[1]).toBe(VERSION)
  })

  it('the version stamped into exported saves matches', async () => {
    // Informational, but it goes inside the player's save file — a save that
    // claims it was written by 0.0.0 is useless for diagnosing a bug report.
    const { APP_VERSION } = await import('@/platform/schemas')
    expect(APP_VERSION).toBe(VERSION)
  })

  it('the desktop bundle identifier is not the Tauri placeholder', () => {
    // `com.tauri.dev` is what `tauri init` writes; shipping it would collide
    // with every other unconfigured Tauri app on a player's machine.
    const conf = JSON.parse(read('src-tauri/tauri.conf.json')) as { identifier: string }
    expect(conf.identifier).not.toBe('com.tauri.dev')
    expect(conf.identifier).toBe('com.gravytraining.tidepool')
  })
})
