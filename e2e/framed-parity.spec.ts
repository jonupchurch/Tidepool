// framed-parity.spec.ts — 019 end to end.
//
// The unit tests prove the engine can build and verify a board whose row totals
// withhold their number. These prove the app SERVES one and the renderer DRAWS
// it — measured from the text the label actually printed, not from the board
// label or the params, for the same reason 016 counts cells rather than trusting
// a silhouette's name and 018 reads clue faces rather than trusting `evenodd`.
import { type Page, expect, test } from '@playwright/test'

interface LabelHook {
  id: string
  /** null when the row's total is withheld as a parity mark (019). */
  total: number | null
  connectivity: 'connected' | 'split' | null
  /** exactly what the margin prints: `7`, `{7}`, `-7-`, `●●`, `{●●}`, `-●-`… */
  text: string
}

interface TestHook {
  ready: boolean
  seed: string
  clueFaces: string[]
  lineLabels: LabelHook[]
}

async function readHook(page: Page): Promise<TestHook> {
  await page.waitForFunction(
    () => (window as unknown as { __TIDEPOOLS__?: TestHook }).__TIDEPOOLS__?.ready === true,
    undefined,
    { timeout: 15_000 },
  )
  return page.evaluate(() => {
    const h = (window as unknown as { __TIDEPOOLS__: TestHook }).__TIDEPOOLS__
    return { ready: h.ready, seed: h.seed, clueFaces: h.clueFaces, lineLabels: h.lineLabels }
  })
}

async function openSeed(page: Page, token: string): Promise<TestHook> {
  await page.goto('/')
  await page.getByRole('textbox', { name: /enter a seed/i }).fill(token)
  await page.getByRole('button', { name: /jump in/i }).click()
  return readHook(page)
}

/** Every parity mark a board printed, at either clue site. */
const parityMarks = (h: TestHook): string[] =>
  [...h.clueFaces, ...h.lineLabels.map((l) => l.text)].filter((t) => t.includes('●'))

test('a row total can withhold its number and show a parity mark', async ({ page }) => {
  const hook = await openSeed(page, 'CORAL-4417 Large Deep evenodd')

  const marks = hook.lineLabels.filter((l) => l.text === '●●' || l.text === '●')
  expect(marks.length, 'no edge total showed a parity mark').toBeGreaterThan(0)

  // A withheld total really is withheld — the hook has no number to give.
  for (const m of marks) expect(m.total, `${m.id} printed a mark but kept its number`).toBeNull()

  // ...and they are a minority. Measured at ~30% of rows when the ladder landed;
  // this asserts the shape of the board, not the exact figure.
  expect(marks.length).toBeLessThan(hook.lineLabels.length)

  // Numbers still dominate the margin, which is what stops it reading as mush.
  const numbers = hook.lineLabels.filter((l) => l.total !== null)
  expect(numbers.length).toBeGreaterThan(marks.length)
})

test('the same seed without `evenodd` keeps every row a plain number', async ({ page }) => {
  const hook = await openSeed(page, 'CORAL-4417 Large Deep')

  expect(parityMarks(hook)).toHaveLength(0)
  for (const l of hook.lineLabels) expect(l.total).not.toBeNull()
  await expect(page.getByText(/CORAL-4417 · Large · Deep$/)).toBeVisible()
})

test('a parity mark in the margin is never a bare digit', async ({ page }) => {
  const hook = await openSeed(page, 'CORAL-4417 Large Deep evenodd')

  for (const l of hook.lineLabels) {
    if (l.total !== null) continue
    // The whole point of `+` / `|` over `E` / `O`: nothing a player could read
    // as a number, in a margin that is otherwise entirely numbers.
    expect(l.text, `row ${l.id}`).not.toMatch(/[0-9]/)
    expect(l.text, `row ${l.id}`).toMatch(/^[{-]?●{1,2}[}-]?$/)
  }
})

test('the board is still shareable by its label', async ({ page }) => {
  // 019 adds no toggle and no seed segment — it extends 018's. This is the test
  // that says so out loud, since "nothing to do" is otherwise indistinguishable
  // from "forgot to do it".
  await openSeed(page, 'CORAL-4417 Large Deep evenodd')
  await expect(page.getByText(/CORAL-4417 · Large · Deep · evenodd/)).toBeVisible()
})

test('a parity mark can carry the run annotation, on a tile and on a row', async ({ page }) => {
  // Edge hints on as well, since `{}` / `--` on a ROW is that toggle's
  // vocabulary — a player who turned it off should not meet it wearing a new
  // face, which is the gate the reduction ladder enforces.
  //
  // BRINE-0019, not TIDE-1234, since 024 — and TIDE-1234 was itself picked to
  // replace CORAL-4417 when 022 landed. Each retune of the density cap starves
  // rung 2 of the ladder further (a framed mark exists only where BARE parity
  // was not enough), so "one board that happens to have both" keeps expiring.
  //
  // Chosen by measurement, not by hope: at the 024 cap only four seeds in a
  // 28-seed sweep carry a framed tile mark AND a framed row mark at this size
  // and difficulty — SILT-0042, BRINE-0019, CORAL-0001, FOAM-7777. BRINE-0019
  // has the most slack of the four (4 framed tiles, 1 framed row), so it is the
  // least likely to go red on a nudge. Across 220 boards 53% carry a framed
  // stone and 37% a framed row: reachable, nowhere near everywhere.
  //
  // If this goes red after a cap change, re-run `npm run measure:parity` and
  // pick a new seed from its output rather than lowering the bar to zero.
  const hook = await openSeed(page, 'BRINE-0019 Large Deep evenodd hints')

  const framedTiles = hook.clueFaces.filter((t) => /^[{-]●{1,2}[}-]$/.test(t))
  expect(framedTiles.length, 'no stone showed a framed parity mark').toBeGreaterThan(0)

  const framedRows = hook.lineLabels.filter((l) => /^[{-]●{1,2}[}-]$/.test(l.text))
  expect(framedRows.length, 'no edge total showed a framed parity mark').toBeGreaterThan(0)
  for (const r of framedRows) expect(r.total).toBeNull()
})

test('all four framed forms are reachable across a handful of boards (SC-003)', async ({
  page,
}) => {
  // Read from what the renderer produced, never from params — the same
  // discipline as 016's cell counts and 018's clue faces.
  // The seed list is a measured covering set, re-derived for 024's cap. `{●}` —
  // a braced ODD mark — is the rarest form the game can print: it needs the
  // ladder to reach rung 2, an odd count of at least three (`canFrameParity`),
  // and a connected ring, all inside a budget that 024 cut to 15%. In a 28-seed
  // sweep only four seeds produced one at all.
  //
  // The first four below cover all four forms between them, in this order, and
  // the rest are slack so a single seed drifting does not fail the sweep. The
  // loop breaks as soon as it has all four, so the common case is still four
  // page loads.
  const seen = new Set<string>()
  for (const seed of [
    'KELP-0007',
    'COVE-0001',
    'TIDE-2789',
    'LAGOON-0006',
    'EBB-0005',
    'COVE-9999',
    'SHELL-4417',
    'CORAL-0001',
  ]) {
    const hook = await openSeed(page, `${seed} Large Deep evenodd hints`)
    for (const t of [...hook.clueFaces, ...hook.lineLabels.map((l) => l.text)]) {
      if (/^[{-]●{1,2}[}-]$/.test(t)) seen.add(t)
    }
    if (seen.size === 4) break
  }
  expect([...seen].sort()).toEqual(['-●-', '-●●-', '{●}', '{●●}'])
})

test('no board below Deep carries a parity form, whatever is switched on', async ({ page }) => {
  // SC-004. The gate lives in the engine, not only in the disabled switch —
  // a stale preference must not be able to reach a Calm board.
  for (const tier of ['Calm', 'Tricky']) {
    const hook = await openSeed(page, `CORAL-4417 Large ${tier} evenodd hints`)
    expect(parityMarks(hook), `${tier} grew a parity form`).toHaveLength(0)
  }
})
