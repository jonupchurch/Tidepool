# Release runbook — Steam (Windows)

Uploading a Windows build to the Tidepool depot with SteamPipe.

| | |
|---|---|
| App ID | `5037710` |
| Windows depot | `5037711` |
| Build script | [`steam/scripts/app_build.vdf`](../steam/scripts/app_build.vdf) |
| Depot script | [`steam/scripts/depot_build_windows.vdf`](../steam/scripts/depot_build_windows.vdf) |
| Driver | [`scripts/release-steam.ts`](./release-steam.ts) — `npm run release:steam` |

Partner ID `422979` identifies the account, not the build; it appears nowhere in
these scripts.

## One-time setup

1. **Confirm the depot ID.** Partner site → Tidepool → SteamPipe → Depots. Steam
   creates a depot at `appid + 1` with the app, which is where `5037711` comes
   from. If yours differs, change it in *both* VDFs — they must agree.
2. **Install steamcmd** to `steam/builder/steamcmd.exe` (gitignored). Either
   Valve's standalone steamcmd or the one in the Steamworks SDK's
   `tools/ContentBuilder/builder/`. Anything on `PATH` works too; set
   `STEAMCMD` to override.
3. **Log in once, interactively:** `steam/builder/steamcmd.exe +login <account>`.
   Answer Steam Guard. steamcmd caches the credential, and every run after that
   is non-interactive. The release script never sees a password.
4. **Set the launch option.** Partner site → Installation → General:
   executable `tidepool.exe`, OS Windows. Without it Steam installs the depot
   and has nothing to run.
5. **Decide the WebView2 question** before public release — see the caveat
   below. It does not block a first upload or your own testing.

## Every release

```bash
# 1. Bump BOTH version fields — they are separate files and drift silently.
#    package.json  "version"        1.0.1 -> 1.0.2
#    src-tauri/tauri.conf.json  "version"   likewise
# 2. Commit, so the build description points at a real tree.
npm run release:steam -- --user <account>
```

Then **partner site → Builds → Set Build Live** on the branch you want. The
upload deliberately goes live on nothing (`"setlive" ""`), so promotion is
always a separate, deliberate act.

### Flags

| Flag | Effect |
|---|---|
| `--user <account>` | Steam account to upload as. Or set `STEAM_USER`. |
| `--preview` | steamcmd reports what *would* upload and uploads nothing. Run this first on a release you care about. |
| `--stage-only` | Build and stage `steam/content/windows/`, don't invoke steamcmd. For inspecting what's about to ship. |
| `--skip-build` | Upload the existing `target/release/tidepool.exe`. Fast, and a good way to ship a stale binary — the script warns, but the responsibility is yours. |

The build description is generated as `Tidepool <version> (<short-sha>)`, with
`-dirty` appended when tracked files have uncommitted changes, so any build in
the partner site's list traces back to a specific tree.

## What ships

One file: `tidepool.exe`. Tauri embeds the built frontend in the executable, so
there is no data folder. `.pdb` symbols, `.d` files and `steam_appid.txt` are
excluded in the depot script as well as being absent from staging — a depot is a
bad place to discover a mistake.

## Caveats worth knowing before launch

**WebView2 is an unmanaged runtime dependency.** Tauri on Windows renders
through Microsoft Edge WebView2, which is *not* in the 5 MB exe. On a machine
without it the app does not start and says nothing.

Steam cannot install it for you: the Common Redistributables list covers
DirectX, Visual C++, .NET, OpenAL, XNA and PhysX — **WebView2 is not on it**.
And because Steam ships the bare executable rather than an installer, the
bootstrapper the NSIS build uses never runs. So there are three real options:

| Option | Cost | Risk |
|---|---|---|
| **Rely on Evergreen** (current) | none | WebView2 ships with Windows 11 and has come down Windows Update on Windows 10 since 2021, so the gap is small but real: LTSC, Server, N editions, and un-updated machines. Failure mode is silent. |
| **Fixed runtime** | ~180 MB depot | None at runtime. Set `bundle.windows.webviewInstallMode` to `fixedRuntime` with an extracted Fixed Version runtime folder. It sits *beside* the exe — it cannot go inside it — so the depot gains a folder and `release-steam.ts` must stage it too. |
| **Steam install script** | approval friction | An `installscript.vdf` running the bootstrapper. Valve gates install scripts; needs their sign-off. |

Shipping on Evergreen is a defensible launch choice for a small cozy puzzle
game, but it is a *choice*, not the absence of one. Make it deliberately.

**Steam Deck needs the Linux build, not Proton.** A Windows Tauri app under
Proton needs WebView2, which does not work there. That's what the native
`ubuntu-22.04` CI build in [`.github/workflows/desktop.yml`](../.github/workflows/desktop.yml)
is for — it links webkit2gtk instead. Shipping it means a second depot, and
verifying webkit2gtk resolves inside the Steam Linux Runtime rather than
assuming the Deck provides it. Out of scope here; 009 calls the Deck
opportunistic.

**Auto-Cloud can't see the saves yet.** The game persists through
localStorage/IndexedDB, which under WebView2 lives in
`%LOCALAPPDATA%\com.gravytraining.tidepool\EBWebView\` — an opaque browser
profile, not a save file. Auto-Cloud needs a file pattern it can match, so it
needs the native save backend from 009 (the `platform/` seam already exists for
exactly this). Configuring Auto-Cloud against the WebView2 profile directory
would sync browser internals and is not the answer.

**The build is unsigned.** Fine for Steam — the client writes depot files
without a Mark-of-the-Web tag, so SmartScreen never fires. It only matters for
direct downloads. If Steam DRM is ever enabled, note Valve's wrapper rewrites
the exe and would invalidate a signature applied here.
