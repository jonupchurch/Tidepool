# Desktop build (Tauri)

The native shell around the web app. **It is a wrap, not a fork** — there is no
game code here, and `src/` remains the single source of truth. The Rust side
exists to open a window, point a webview at the built `dist/`, and eventually
carry the Steam integration.

## Building

```bash
npm run desktop:build     # production build → installers + a bare .exe
npm run desktop:dev       # hot-reloading dev window against the Vite server
```

`desktop:build` runs `npm run build` first (via `beforeBuildCommand`), so the
bundled frontend is always the checked build, never a stale `dist/`.

Artifacts land in `src-tauri/target/release/`:

| Path | What it's for |
|------|---------------|
| `tidepool.exe` | The bare executable — **this is what Steam ships**. Steam distributes files directly and runs the binary; it does not want an installer. |
| `bundle/nsis/Tidepool_<version>_x64-setup.exe` | Installer for distributing outside Steam (itch.io, a direct download). |
| `bundle/msi/Tidepool_<version>_x64_en-US.msi` | MSI, for anyone deploying via policy. Rarely needed. |

## Linux / Steam Deck

Built in CI, not locally — see [`.github/workflows/desktop.yml`](../.github/workflows/desktop.yml).
Trigger it from the Actions tab, with `gh workflow run desktop.yml`, or by pushing
a `v*` tag. Artifacts: the bare `tidepool` binary (what Steam ships), an
AppImage, and a `.deb`.

The runner is pinned to **ubuntu-22.04**, not `ubuntu-latest`. The Steam Deck's
runtime ships an older glibc than 24.04 builds against, and a binary linked
against a newer glibc refuses to start rather than degrading — the symptom is a
game that simply does nothing when launched.

Linux uses webkit2gtk rather than WebView2, so it is a genuinely different
browser engine from the Windows build. Canvas and layout behaviour should be
checked there rather than assumed.

## Prerequisites

- **Rust, MSVC toolchain** — `rustup default stable-x86_64-pc-windows-msvc`.
  The `windows-gnu` toolchain will *not* work: Tauri links against MSVC-built
  WebView2 libraries, and gnu fails at link time with unhelpful errors.
- **Visual Studio Build Tools** with the C++ workload (`VCTools`).
- **WebView2 runtime** — preinstalled on Windows 11 and current Windows 10, so
  players generally need nothing. Tauri can bundle a bootstrapper if that ever
  changes.

After installing Rust, **open a new terminal** — `cargo` won't be on the PATH of
any shell that was already running.

## Icons

Generated, not hand-made: `npm run make:icons` derives `icons/icon.png` from the
crab portrait, and `npx tauri icon src-tauri/icons/icon.png` fans that out to
every platform size. Don't edit the generated files — change the crop in
[`scripts/make-icons.ts`](../scripts/make-icons.ts) and re-run.

The Android/iOS icon sets `tauri icon` also emits are deleted deliberately; this
game does not target mobile.

## Version

The version lives in **four** places — `src/ui/about/about.ts` (what the player
sees), `package.json`, `tauri.conf.json` (the installer), and `Cargo.toml`.
`src/ui/about/about.test.ts` asserts they all agree, so bumping one and
forgetting the rest fails the suite instead of shipping an installer that
disagrees with the About screen.

## Saves

One file: **`%APPDATA%\com.gravytraining.tidepool\save.json`** on Windows (the
app data dir for the configured `identifier`). Verified on a real machine, not
read off documentation — the app exposes a `save_location` command so the path
can always be confirmed rather than assumed.

For **Steam Auto-Cloud** that maps to root path `%WinAppDataRoaming%`, subdirectory
`com.gravytraining.tidepool`, pattern `save.json`.

Why one file rather than one per key: Auto-Cloud syncs file *patterns*, and a
save has to move between machines as a consistent unit. Split across files, a
partial sync could land a journal that disagrees with its stats — corruption a
player would notice and couldn't fix.

Writes go to a temp file, get flushed to the physical disk, then rename over the
real one. Renaming within a directory is atomic, so a crash or power cut leaves
either the old save or the new one, never a half-written file.

The logic lives in TypeScript (`src/platform/tauri-backend.ts`) where it's
unit-testable without a webview; [`save.rs`](src/save.rs) just moves bytes.

## Notes

- **`identifier`** (`com.gravytraining.tidepool`) determines where the OS puts
  the app's data. Changing it after release orphans every player's save.
- The **release profile** is tuned for size (`opt-level = "s"`, LTO, stripped) —
  ~4.8 MB. Nothing performance-sensitive runs in Rust; the game lives in the
  webview.
- A **CSP** is set in `tauri.conf.json`. The app is fully self-contained, so it
  is strict (`default-src 'self'`). Verified not to block fonts, audio, images,
  or the generator worker — if you add a runtime asset source, check it here.
