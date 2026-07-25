import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { type CreatureView, creatureDef } from '@/game'
import { CreatureCard } from './CreatureCard'

const view = (id: string, found: boolean, count = 1, seed = 'TIDE-0007'): CreatureView => ({
  def: creatureDef(id)!,
  found,
  count: found ? count : 0,
  firstFoundSeed: found ? seed : null,
})

describe('CreatureCard (US1)', () => {
  it('found → art + name + rarity + description + discovery detail', () => {
    render(<CreatureCard card={view('crab', true, 3)} />)
    expect(screen.getByText('Shore Crab')).toBeInTheDocument()
    expect(screen.getByText(/uncommon/i)).toBeInTheDocument()
    expect(screen.getByText(/sidles between the stones/i)).toBeInTheDocument()
    expect(screen.getByText(/first at TIDE-0007/i)).toBeInTheDocument()
    // crab has real art → a real <img>, not the placeholder
    const img = screen.getByRole('img', { name: /shore crab/i }) as HTMLImageElement
    expect(img.getAttribute('src')).toBe('/crab.png')
  })

  it('found but art-less → a styled placeholder, never a broken card (FR-008)', () => {
    render(<CreatureCard card={view('limpet', true)} />)
    expect(screen.getByText('Limpet')).toBeInTheDocument()
    // no <img> is rendered for an art-less creature
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('unfound → a silhouette labelled "not yet found" (accessible)', () => {
    render(<CreatureCard card={view('octopus', false)} />)
    expect(screen.getByText(/not yet found/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/undiscovered creature/i)).toBeInTheDocument()
    // the creature's identity is hidden until discovered
    expect(screen.queryByText('Little Octopus')).not.toBeInTheDocument()
  })
})
