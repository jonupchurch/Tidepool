// release-steam.ts — build the Windows desktop app and upload it to the Steam
// depot. Run: `npm run release:steam -- --user <steam-account>`.
//
// The runbook (credentials, first-time setup, promoting a build) is
// `scripts/release-steam.md`. What this file is for is making the *staging*
// step reproducible: the depot gets exactly one file, copied from a build that
// just ran, rather than whatever happened to be left in `target/release/` from
// a debugging session three days ago.
//
// Deliberately absent: any handling of your Steam password. steamcmd caches
// credentials after one interactive login, so this shells out to it with
// `+login <user>` and inherited stdio — a Steam Guard prompt appears in your
// terminal and you answer it. A password in a script is a password in a shell
// history, a CI log, and eventually a git commit.
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import type { Stats } from 'node:fs'
import { resolve } from 'node:path'

/** The whole game: Tauri embeds the frontend, so there is nothing to ship beside it. */
const EXE = 'src-tauri/target/release/tidepool.exe'
const STAGE = 'steam/content/windows'
const TEMPLATE = 'steam/scripts/app_build.vdf'
/** Generated per run and gitignored — the committed template keeps the IDs. */
const GENERATED = 'steam/scripts/.app_build.run.vdf'

const argv = process.argv.slice(2)
const has = (flag: string) => argv.includes(flag)
const valueOf = (flag: string) => {
  const i = argv.indexOf(flag)
  return i === -1 ? undefined : argv[i + 1]
}

const user = valueOf('--user') ?? process.env.STEAM_USER
const skipBuild = has('--skip-build')
const preview = has('--preview')
const stageOnly = has('--stage-only')

const die = (msg: string): never => {
  console.error(`  !!  ${msg}`)
  process.exit(1)
}

// ---------------------------------------------------------------- build

if (skipBuild) {
  console.log('  ..  --skip-build: uploading whatever is already in target/release/')
} else {
  console.log('  ..  npm run desktop:build\n')
  const built = spawnSync('npm', ['run', 'desktop:build'], { stdio: 'inherit', shell: true })
  if (built.status !== 0) die('desktop build failed — nothing staged, nothing uploaded.')
}

const exe: Stats = (() => {
  try {
    return statSync(EXE)
  } catch {
    return die(`${EXE} not found. Run \`npm run desktop:build\` first.`)
  }
})()

// ---------------------------------------------------------------- stage

rmSync(STAGE, { recursive: true, force: true })
mkdirSync(STAGE, { recursive: true })
copyFileSync(EXE, `${STAGE}/tidepool.exe`)

const mb = (exe.size / 1024 / 1024).toFixed(1)
console.log(`\n  ok  staged tidepool.exe  ${mb} MB  built ${exe.mtime.toISOString()}`)

// ------------------------------------------------------- build description

const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim()
const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }

// Tracked changes only. Untracked files (loose store art in `resources/`, say)
// don't change what got compiled, and shouldn't smear "dirty" across every build.
const dirty = git('status', '--porcelain', '--untracked-files=no') !== ''
const desc = `Tidepool ${version} (${git('rev-parse', '--short', 'HEAD')}${dirty ? '-dirty' : ''})`

if (dirty) console.log('  !!  working tree has uncommitted changes — build tagged -dirty')

// replaceAll, not replace: a token named in a comment as well as used as a
// value would otherwise eat the substitution and ship a literal placeholder.
const generated = readFileSync(TEMPLATE, 'utf8')
  .replaceAll('__DESC__', desc)
  .replaceAll('__PREVIEW__', preview ? '1' : '0')

// A token surviving substitution means the template drifted; uploading with a
// literal `__DESC__` in the build list is worse than stopping here.
const leftover = generated.match(/__[A-Z_]+__/)
if (leftover) die(`${TEMPLATE} has an unsubstituted token: ${leftover[0]}`)

writeFileSync(GENERATED, generated)
console.log(`  ok  ${desc}${preview ? '  [preview — no upload]' : ''}`)

if (stageOnly) {
  console.log(`\n  ok  --stage-only: ${STAGE}/ ready, steamcmd not run.`)
  process.exit(0)
}

// --------------------------------------------------------------- upload

// A local steamcmd (the ContentBuilder layout) wins over one on PATH, so a
// pinned copy beside the scripts is what runs when it's there.
const steamcmd =
  process.env.STEAMCMD ??
  (() => {
    try {
      statSync('steam/builder/steamcmd.exe')
      return resolve('steam/builder/steamcmd.exe')
    } catch {
      return 'steamcmd'
    }
  })()

const account = user ?? die('no Steam account. Pass `--user <account>` or set STEAM_USER.')

console.log(`\n  ..  ${steamcmd} → app 5037710 as ${account}\n`)

// steamcmd resolves a relative script path against its own cwd, not ours.
const run = spawnSync(
  steamcmd,
  ['+login', account, '+run_app_build', resolve(GENERATED), '+quit'],
  { stdio: 'inherit', shell: true },
)

if (run.status !== 0) {
  die(
    'steamcmd failed. If it was a login error, run `steamcmd +login <account>` ' +
      'once on its own to answer Steam Guard and cache credentials.',
  )
}

// `--preview` runs steamcmd all the way through a build *preview*, which
// succeeds without uploading anything. Reporting "uploaded" either way is how
// someone ends up believing a dry run shipped, or — worse — that a real run
// didn't need doing.
if (preview) {
  console.log(`\n  ok  preview only, nothing uploaded — ${desc}`)
  console.log('      Re-run without --preview to upload it.')
} else {
  console.log(`\n  ok  uploaded — ${desc}`)
  console.log('      It is NOT live. Partner site → Builds → Set Build Live to promote it.')
}
