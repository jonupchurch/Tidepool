import { GameplayScreen } from '@/ui'

// The gameplay board is the app root for now; feature 003 (App Shell) will add
// Home/routing around it.
export default function App() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-sand text-ink">
      <GameplayScreen />
    </main>
  )
}
