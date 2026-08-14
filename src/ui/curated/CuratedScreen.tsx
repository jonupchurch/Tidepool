// CuratedScreen.tsx — the curated coastline as a hex of hexes of hexes: six
// groups arranged on a hex ring, each group itself a ring of six hex tiles, each
// tile one board. Every ring is hollow, and the hole carries that ring's label —
// the group's name in a group, the overall tally at the centre of the whole
// thing. Selecting a tile hands its BoardRequest to Gameplay; locked tiles
// (US4 gating) are not selectable.
//
// Geometry is laid out in hex units (s = a tile's centre→corner radius) and
// emitted as percentages of a square container, so the whole arrangement scales
// with the viewport without re-measuring.
import { useState } from 'react'
import type { BoardRequest, CuratedGroupRows, CuratedRow } from '@/game/board-source'

export interface CuratedScreenProps {
  groups: CuratedGroupRows[]
  onSelect: (request: BoardRequest, curatedId: string) => void
  onBack: () => void
}

const SQRT3 = Math.sqrt(3)

/**
 * The six pointy-top hex neighbour directions as unit vectors, ordered
 * clockwise from top-left so a ring reads in a natural order.
 */
const RING: Array<{ x: number; y: number }> = [
  { x: -0.5, y: -SQRT3 / 2 }, // NW
  { x: 0.5, y: -SQRT3 / 2 }, // NE
  { x: 1, y: 0 }, // E
  { x: 0.5, y: SQRT3 / 2 }, // SE
  { x: -0.5, y: SQRT3 / 2 }, // SW
  { x: -1, y: 0 }, // W
]

/** Distance from a group's centre to each of its tiles (one hex step). */
const TILE_RING = SQRT3
/** A group's outer radius: its ring plus half a tile. */
const GROUP_RADIUS = TILE_RING + 1
/** Distance from the centre to each group's centre — two group-radii apart. */
const GROUP_RING = GROUP_RADIUS * 2.12
/** Half the full arrangement, in hex units. */
const EXTENT = GROUP_RING + GROUP_RADIUS

/** Hex units → percent of the square container, measured from its centre. */
const pct = (v: number): number => 50 + (v / (EXTENT * 2)) * 100
const size = (v: number): number => (v / (EXTENT * 2)) * 100

/** Mistakes recorded across a set of boards (best run each). */
const errorsIn = (rows: CuratedRow[]): number => rows.reduce((n, r) => n + (r.errors ?? 0), 0)

export function CuratedScreen({ groups, onSelect, onBack }: CuratedScreenProps) {
  const all = groups.flatMap((g) => g.rows)
  const solved = all.filter((r) => r.solved).length
  const errors = errorsIn(all)

  return (
    <div className="h-full w-full overflow-y-auto bg-sand text-ink">
      <div className="mx-auto flex max-w-5xl flex-col items-center px-4 py-8">
        <header className="text-center">
          <h1 className="font-display text-4xl text-deep-pool">Curated shores</h1>
          <p className="mt-1 text-tide">A gentle coastline of hand-tuned pools.</p>
        </header>

        <div className="@container relative my-6 aspect-square w-full min-w-88 max-w-3xl">
          {groups.slice(0, RING.length).map((g, i) => (
            <GroupCluster
              key={g.group.id}
              group={g}
              centre={{ x: RING[i].x * GROUP_RING, y: RING[i].y * GROUP_RING }}
              onSelect={onSelect}
            />
          ))}

          {/* The hole at the middle of the whole arrangement. */}
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-center"
            style={{ left: '50%', top: '50%' }}
          >
            <p className="font-display text-[3.2cqw] leading-tight text-deep-pool">
              {solved}
              <span className="text-rock">/{all.length}</span>
            </p>
            <p className="text-[1.5cqw] uppercase tracking-wide text-rock">shores</p>
            {/* Replay a board cleanly and its mistakes drop off this tally. */}
            <p
              className={`mt-[0.4cqw] text-[1.5cqw] tabular-nums ${errors > 0 ? 'text-coral' : 'text-tide'}`}
            >
              {errors > 0 ? `⚠ ${errors}` : solved > 0 ? '⚠ clean' : ''}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="rounded-full bg-foam px-5 py-2 text-sm text-deep-pool hover:bg-driftwood"
        >
          Back to shore
        </button>
      </div>
    </div>
  )
}

const DIFF_TEXT: Record<string, string> = {
  Calm: 'text-tide',
  Tricky: 'text-sea-glass',
  Deep: 'text-deep-pool',
}

/** One group: six tiles on a ring, its name in the hole at the middle. */
function GroupCluster({
  group,
  centre,
  onSelect,
}: {
  group: CuratedGroupRows
  centre: { x: number; y: number }
  onSelect: (r: BoardRequest, id: string) => void
}) {
  const { rows } = group
  const band = rows[0]?.entry
  const done = rows.filter((r) => r.solved).length
  const groupErrors = errorsIn(rows)

  return (
    <section aria-label={group.group.name}>
      {rows.slice(0, RING.length).map((row, i) => (
        <HexTile
          key={row.entry.id}
          row={row}
          x={centre.x + RING[i].x * TILE_RING}
          y={centre.y + RING[i].y * TILE_RING}
          onSelect={onSelect}
        />
      ))}

      {/* The hole at the middle of this group. */}
      <div
        className="pointer-events-none absolute w-[13cqw] -translate-x-1/2 -translate-y-1/2 text-center leading-tight"
        style={{ left: `${pct(centre.x)}%`, top: `${pct(centre.y)}%` }}
      >
        <p className="font-display text-[1.85cqw] text-deep-pool">{group.group.name}</p>
        {band && (
          <p className={`text-[1.3cqw] ${DIFF_TEXT[band.difficulty] ?? 'text-rock'}`}>
            {band.size} · {band.difficulty}
          </p>
        )}
        <p className="text-[1.3cqw] tabular-nums text-rock">
          ({done}/{rows.length}){groupErrors > 0 && <span className="text-coral"> ⚠{groupErrors}</span>}
        </p>
      </div>
    </section>
  )
}

/** One board as a pointy-top hex tile, positioned by its centre in hex units. */
function HexTile({
  row,
  x,
  y,
  onSelect,
}: {
  row: CuratedRow
  x: number
  y: number
  onSelect: (r: BoardRequest, id: string) => void
}) {
  const { entry, solved, earnedCreature, locked } = row
  const [copied, setCopied] = useState(false)

  const copySeed = (e: React.MouseEvent) => {
    e.preventDefault()
    void (async () => {
      try {
        await navigator.clipboard?.writeText(entry.seed)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1200)
      } catch {
        // clipboard unavailable — the seed is still in the tooltip
      }
    })()
  }

  const fill = locked
    ? 'bg-driftwood text-rock'
    : solved
      ? 'bg-tide text-foam'
      : 'bg-foam text-deep-pool hover:bg-tide-fill'
  const flawed = (row.errors ?? 0) > 0
  // Clean = solved with a best run of zero mistakes (011 FR-006). `errors` is
  // null until solved and undefined for boards finished before mistakes were
  // tracked, so this deliberately requires an explicit zero.
  const clean = solved && row.errors === 0
  const label = locked
    ? `${entry.name}, locked`
    : `${entry.name}, ${entry.size} ${entry.difficulty}${solved ? ', solved' : ''}${
        clean ? ', finished clean' : ''
      }${flawed ? `, ${row.errors} mistakes` : ''}`

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${pct(x)}%`,
        top: `${pct(y)}%`,
        width: `${size(SQRT3 * 0.94)}%`,
        height: `${size(2 * 0.94)}%`,
      }}
    >
      <button
        type="button"
        disabled={locked}
        onClick={() => onSelect(row.request, entry.id)}
        onContextMenu={copySeed}
        aria-label={label}
        title={`${entry.name} · ${entry.seed}${flawed ? ` · ${row.errors} mistakes` : ''}${
          copied ? ' (copied)' : ''
        }`}
        className={`grid h-full w-full place-items-center shadow-sm transition-colors ${fill} ${
          locked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
        }`}
        style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
      >
        {/* Names wrap and centre inside the hex rather than truncating — a hex
            narrows toward its points, so text is held to the width of the flat
            middle band and clamped to two lines. */}
        <span className="flex w-[80%] flex-col items-center gap-[0.15cqw] text-center leading-[1.15]">
          <span className="font-display text-[1.9cqw] tabular-nums">
            {locked ? '🔒' : entry.order}
          </span>
          <span className="line-clamp-2 text-[1.1cqw] wrap-anywhere">{entry.name}</span>
          {/* Full opacity: the creature you earned is the reward, and it has to
              be readable against the solved tile's fill. */}
          {solved && earnedCreature && (
            <span className="line-clamp-2 font-display text-[1.1cqw] wrap-anywhere">
              {/* A clean board earns its own glyph rather than just lacking the
                  coral ring — distinguishable without relying on colour, which
                  is the bar 006 set for every state on the board. */}
              {clean ? '✨' : '✓'} {earnedCreature}
            </span>
          )}
        </span>
      </button>

      {/* A board still carrying mistakes wears a dashed coral ring. Drawn as an
          SVG overlay because a CSS border would be cut away by the clip-path;
          non-scaling-stroke keeps it even despite the stretched viewBox. Replay
          it cleanly and the ring goes. */}
      {flawed && (
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polygon
            points="50,2 98,26 98,74 50,98 2,74 2,26"
            fill="none"
            stroke="var(--color-coral)"
            strokeWidth="2"
            strokeDasharray="6 4"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    </div>
  )
}
