import { render, screen } from '@testing-library/react'
import App from '@/App'

describe('App', () => {
  it('renders the wordmark', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /tidepools/i })).toBeInTheDocument()
  })
})
