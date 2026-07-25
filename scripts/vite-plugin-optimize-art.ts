// vite-plugin-optimize-art.ts — shrink the bundled creature portraits at build
// time. Source files in `public/img/` stay exactly as exported (full-resolution,
// as committed); this rewrites only the copies Vite emits into `dist/`.
//
// Vite copies `public/` verbatim and runs no transforms over it, so this hooks
// after the bundle is written and post-processes the emitted files in place.
//
// Portraits render at 64px in the journal and 96px on the splash, so 512px is
// still generous at 2× device pixel ratio. Aspect ratio is preserved — a
// portrait is only scaled down, never padded or cropped.
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Plugin } from 'vite'

/** Longest edge kept in the shipped build. */
const MAX_EDGE = 512

export function optimizeArt(dir = 'img'): Plugin {
  return {
    name: 'tidepools:optimize-art',
    apply: 'build',
    // `closeBundle` runs after public/ has been copied into the out dir.
    async closeBundle() {
      // Imported lazily so `vite build` still works where sharp can't load
      // (a platform without its native binary) — the build must not hard-fail
      // over an optimization.
      let sharp: (typeof import('sharp'))['default']
      try {
        sharp = (await import('sharp')).default
      } catch (err) {
        this.warn(`art optimization skipped — sharp unavailable (${(err as Error).message})`)
        return
      }

      const outDir = join('dist', dir)
      let files: string[]
      try {
        files = await readdir(outDir)
      } catch {
        return // nothing bundled under this directory
      }

      let savedBytes = 0
      let touched = 0
      for (const name of files) {
        if (!name.toLowerCase().endsWith('.png')) continue
        const file = join(outDir, name)
        const before = (await stat(file)).size
        try {
          const img = sharp(await readFile(file))
          const { width = 0, height = 0 } = await img.metadata()
          const out = await img
            // `withoutEnlargement` keeps an already-small portrait untouched.
            .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
            .png({ compressionLevel: 9, palette: true })
            .toBuffer()
          // Never make a file bigger than it started.
          if (out.length >= before) continue
          await writeFile(file, out)
          savedBytes += before - out.length
          touched++
          this.info?.(
            `${name}: ${width}x${height} ${kb(before)} -> ${kb(out.length)}`,
          )
        } catch (err) {
          this.warn(`could not optimize ${name}: ${(err as Error).message}`)
        }
      }

      if (touched > 0) {
        console.log(`\noptimize-art: ${touched} image(s), saved ${kb(savedBytes)}`)
      }
    },
  }
}

const kb = (bytes: number): string => `${Math.round(bytes / 1024)} KB`
