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
| `tidepools.exe` | The bare executable — **this is what Steam ships**. Steam distributes files directly and runs the binary; it does not want an installer. |
| `bundle/nsis/Tidepools_<version>_x64-setup.exe` | Installer for distributing outside Steam (itch.io, a direct download). |
| `bundle/msi/Tidepools_<version>_x64_en-US.msi` | MSI, for anyone deploying via policy. Rarely needed. |

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

## Notes

- **`identifier`** (`com.gravytraining.tidepools`) determines where the OS puts
  the app's data. Changing it after release orphans every player's save.
- The **release profile** is tuned for size (`opt-level = "s"`, LTO, stripped) —
  ~4.8 MB. Nothing performance-sensitive runs in Rust; the game lives in the
  webview.
- A **CSP** is set in `tauri.conf.json`. The app is fully self-contained, so it
  is strict (`default-src 'self'`). Verified not to block fonts, audio, images,
  or the generator worker — if you add a runtime asset source, check it here.
