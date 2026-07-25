import { getSaveStore, removeRecord } from '@/platform'
import { ErrorBoundary } from '@/ui/error/ErrorBoundary'
import { AppShell } from '@/ui/shell'

// The app shell (feature 003) is the root: it lands on Home and routes to
// Gameplay, Splash, Pause, and the secondary screens.
//
// Wrapped in an error boundary so a render error shows a way home instead of a
// white screen. Its deeper recovery clears the in-progress board — the one piece
// of saved state that gets rebuilt into live objects on load, and so the
// likeliest thing to crash the app the same way on every launch. Everything else
// (journal, stats, curated progress, settings) is deliberately left alone.
export default function App() {
  const clearSavedBoard = async () => {
    await removeRecord(getSaveStore(), 'inProgressBoard')
  }

  return (
    <ErrorBoundary onClearSaved={clearSavedBoard}>
      <AppShell />
    </ErrorBoundary>
  )
}
