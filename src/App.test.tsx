import { render, screen } from '@testing-library/react'
import App from '@/App'

describe('App', () => {
  it('boots to the splash (wordmark + crab)', () => {
    render(<App />)
    // Splash is the first impression; it dismisses to Home once ready
    // (the Home reveal is exercised end-to-end by the e2e suite).
    expect(screen.getByRole('heading', { name: /tidepool/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /crab/i })).toBeInTheDocument()
  })
})
