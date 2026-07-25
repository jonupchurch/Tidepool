import { describe, expect, it } from 'vitest'
import type { BoardParams } from '@/core'
import { current, initialNav, navReducer } from './nav'
import type { GameplayLaunch, Screen } from './types'

const params = (seed: string): BoardParams => ({
  seed,
  size: 'Small',
  difficulty: 'Calm',
  clues: { connectivity: true, lineTotals: true },
})
const launch = (seed: string, resume = false): GameplayLaunch => ({ params: params(seed), resume })

describe('navReducer', () => {
  it('starts at the given screen', () => {
    const s = initialNav('Splash')
    expect(current(s).screen).toBe('Splash')
    expect(s.stack).toHaveLength(1)
  })

  it('navigates to each screen', () => {
    let s = initialNav('Home')
    const screens: Screen[] = ['Gameplay', 'Curated', 'Journal', 'Tutorial']
    for (const screen of screens) {
      s = navReducer(s, { type: 'navigate', entry: { screen } })
      expect(current(s).screen).toBe(screen)
    }
  })

  it('back restores the prior screen and its context', () => {
    let s = initialNav('Home')
    s = navReducer(s, { type: 'navigate', entry: { screen: 'Tutorial' } })
    s = navReducer(s, { type: 'back' })
    expect(current(s).screen).toBe('Home')
  })

  it('back at the root is a no-op (never empties the stack)', () => {
    let s = initialNav('Home')
    s = navReducer(s, { type: 'back' })
    expect(s.stack).toHaveLength(1)
    expect(current(s).screen).toBe('Home')
  })

  it('ignores duplicate navigation to the identical screen (rapid double-activation)', () => {
    let s = initialNav('Home')
    s = navReducer(s, { type: 'navigate', entry: { screen: 'Journal' } })
    const before = s
    s = navReducer(s, { type: 'navigate', entry: { screen: 'Journal' } })
    expect(s).toBe(before)
    expect(s.stack).toHaveLength(2)
  })

  it('treats gameplay launches with different seeds as distinct entries', () => {
    let s = initialNav('Home')
    s = navReducer(s, { type: 'navigate', entry: { screen: 'Gameplay', launch: launch('A') } })
    s = navReducer(s, { type: 'navigate', entry: { screen: 'Gameplay', launch: launch('B') } })
    expect(s.stack).toHaveLength(3)
    // …but a repeat of the same launch collapses.
    const before = s
    s = navReducer(s, { type: 'navigate', entry: { screen: 'Gameplay', launch: launch('B') } })
    expect(s).toBe(before)
  })

  it('reset collapses history to a single entry', () => {
    let s = initialNav('Home')
    s = navReducer(s, { type: 'navigate', entry: { screen: 'Tutorial' } })
    s = navReducer(s, { type: 'reset', entry: { screen: 'Home' } })
    expect(s.stack).toHaveLength(1)
    expect(current(s).screen).toBe('Home')
  })

  it('bounds history so rapid navigation cannot grow unbounded', () => {
    let s = initialNav('Home')
    const order: Screen[] = ['Curated', 'Journal', 'Tutorial']
    for (let i = 0; i < 100; i++) {
      s = navReducer(s, { type: 'navigate', entry: { screen: order[i % order.length] } })
    }
    expect(s.stack.length).toBeLessThanOrEqual(24)
  })
})
