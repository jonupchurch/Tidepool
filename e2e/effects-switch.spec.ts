// effects-switch.spec.ts — 017 end to end. The claim is about what is AUDIBLE,
// so this reads the live Web Audio gain nodes rather than the switch's state:
// the effects channel must go silent while the music channel keeps playing.
import { expect, test } from '@playwright/test'

/** Patch AudioContext to record every gain node the app creates, in order. */
async function trackGains(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __GAINS__: GainNode[] }
    w.__GAINS__ = []
    const Ctor = window.AudioContext
    const orig = Ctor.prototype.createGain
    Ctor.prototype.createGain = function (this: AudioContext) {
      const g = orig.call(this)
      w.__GAINS__.push(g)
      return g
    }
  })
}

const gains = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    (window as unknown as { __GAINS__: GainNode[] }).__GAINS__.map((g) => g.gain.value),
  )

test('the effects can be silenced while the music plays on', async ({ page }) => {
  await trackGains(page)
  await page.goto('/')
  // Audio only exists after a gesture (autoplay policy).
  await page.getByRole('button', { name: /^Small$/ }).click()
  await expect.poll(async () => (await gains(page)).length).toBeGreaterThanOrEqual(3)

  // The bed is a 3.4 MB MP3 that is fetched, decoded, then ramped in, so its
  // gain is legitimately 0 for a moment after the gesture. Wait for it to come
  // up rather than racing it — the point of this test is what happens *after*.
  await expect.poll(async () => (await gains(page))[2], { timeout: 20_000 }).toBeGreaterThan(0)

  const [master, sfx, music] = await gains(page)
  expect(master).toBeGreaterThan(0)
  expect(sfx).toBeGreaterThan(0)
  expect(music).toBeGreaterThan(0)

  await page.getByRole('button', { name: /turn sound effects off/i }).click()

  await expect.poll(async () => (await gains(page))[1]).toBe(0)
  const after = await gains(page)
  expect(after[0], 'the master is untouched').toBeGreaterThan(0)
  expect(after[2], 'the bed plays on').toBeGreaterThan(0)
})

test('mute still takes everything, and the effects switch survives it', async ({ page }) => {
  await trackGains(page)
  await page.goto('/')
  await page.getByRole('button', { name: /^Small$/ }).click()
  await expect.poll(async () => (await gains(page)).length).toBeGreaterThanOrEqual(3)

  await page.getByRole('button', { name: /^mute$/i }).click()
  await expect.poll(async () => (await gains(page))[0]).toBe(0)

  await page.getByRole('button', { name: /unmute/i }).click()
  await expect.poll(async () => (await gains(page))[0]).toBeGreaterThan(0)
  // Mute is a master, not a state the channel switches inherit.
  expect((await gains(page))[1]).toBeGreaterThan(0)
})

test('the choice survives a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /turn sound effects off/i }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: /turn sound effects on/i })).toBeVisible()
})
