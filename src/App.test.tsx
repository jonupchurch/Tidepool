import { render, screen } from '@testing-library/react'
import App from '@/App'

describe('App', () => {
  it('mounts the gameplay screen chrome', () => {
    render(<App />)
    // The gameplay TopBar renders immediately (board loads asynchronously).
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument()
  })
})
