// PauseOverlay.tsx — the soft Pause scrim over a frozen board. Implemented in US4.
export interface PauseOverlayProps {
  onResume: () => void
  onNewBoard: () => void
  onRestart: () => void
  onSettings: () => void
  onHome: () => void
}

export function PauseOverlay(_props: PauseOverlayProps) {
  return null
}
