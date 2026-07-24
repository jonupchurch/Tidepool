# Stack packs

Repo-local, framework-specific conventions to read **before** writing code in a
given stack. Each file is a short, opinionated defaults sheet — not a tutorial.

## Why these live here (and not as plugin skills)

Session-level plugin skills (e.g. the Vercel plugin's Next.js skills) are
excellent but they **don't travel** when you copy `.claude/` + `.specify/` into
a target repo — they live in your Claude Code install, not the repo. These
stack packs *do* travel, so the guidance is present in whatever codebase you
land in, even offline.

They're also subordinate to the target repo: if the codebase you're working in
already does something differently, **the codebase wins** (constitution
Principle III). A stack pack is the default you reach for only when the repo
hasn't already established a pattern.

## How to use

- When a job is in a stack you have a pack for, read that pack during
  orientation (`/orient`), alongside whatever `codebase-scout` reports about
  how *this* repo actually does things.
- If the repo and the pack conflict, follow the repo and say so out loud.

## Available packs

- _None yet._ A `tidepools.md` pack for this project's Vite + TypeScript +
  Canvas + Tauri stack is forthcoming (module split: `core` / `game` / `render`
  / `ui` / `platform`; Vitest for the engine, Playwright for e2e).

## Adding a pack

Give a pack a short "defaults" section, a "where things go" section, a "don't"
list, and a "verify" checklist. Keep it to one screen — it's a reference to
glance at, not documentation to read through.
