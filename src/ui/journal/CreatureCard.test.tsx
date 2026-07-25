import { fireEvent, render, screen } from '@testing-library/react'
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
    // Art is found by convention — public/img/<id>.png — with no catalog entry.
    const img = screen.getByRole('img', { name: /shore crab/i }) as HTMLImageElement
    expect(img.getAttribute('src')).toBe('/img/crab.png')
  })

  it('falls back to a styled placeholder when the art file is missing (FR-008)', () => {
    render(<CreatureCard card={view('limpet', true)} />)
    const img = screen.getByRole('img', { name: /limpet/i })
    expect(img.getAttribute('src')).toBe('/img/limpet.png')

    // The file isn't there yet: the failed load degrades, never a broken image.
    fireEvent.error(img)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('Limpet')).toBeInTheDocument()
  })

  it('unfound → a silhouette labelled "not yet found" (accessible)', () => {
    render(<CreatureCard card={view('octopus', false)} />)
    expect(screen.getByText(/not yet found/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/undiscovered creature/i)).toBeInTheDocument()
    // the creature's identity is hidden until discovered
    expect(screen.queryByText('Little Octopus')).not.toBeInTheDocument()
  })
})
