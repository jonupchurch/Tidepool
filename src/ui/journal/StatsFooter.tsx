// StatsFooter.tsx — the gentle lifetime-stats footer (FR-006). Display-only: it
// renders totals it is given; the journal screen reads them from persistence
// (008) and the recorder owns writing them. Theme tokens only.
import type { JournalStats } from '@/game'

export function StatsFooter({ stats }: { stats: JournalStats }) {
  return (
    <footer
      className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-tide"
      aria-label="Lifetime shore stats"
    >
      <span>🌊 {stats.boardsSolved} boards solved</span>
      <span>💧 {stats.poolsFilled} pools filled</span>
      <span>🐚 {stats.creaturesFound} creatures found</span>
    </footer>
  )
}
