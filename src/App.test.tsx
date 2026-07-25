import { render, screen } from '@testing-library/react'
import App from '@/App'

describe('App', () => {
  it('boots to the Home shell', () => {
    render(<App />)
    // Home is the default screen: the wordmark + primary Play action render.
    expect(screen.getByRole('heading', { name: /tidepools/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^play$/i })).toBeInTheDocument()
  })
})
