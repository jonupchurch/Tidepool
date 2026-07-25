import { describe, expect, it } from 'vitest'
import {
  type BoardRequest,
  DEFAULT_CLUES,
  isBoardRequest,
  launchBoard,
  toBoardParams,
  toDifficultyTier,
  toSizeTier,
} from './request'

const req = (over: Partial<BoardRequest> = {}): BoardRequest => ({
  seed: 'CORAL-4417',
  size: 'Medium',
  difficulty: 'Tricky',
  ...over,
})

describe('label ↔ tier mapping', () => {
  it('accepts the human labels as engine tiers', () => {
    expect(toSizeTier('Small')).toBe('Small')
    expect(toSizeTier('Large')).toBe('Large')
    expect(toDifficultyTier('Calm')).toBe('Calm')
    expect(toDifficultyTier('Deep')).toBe('Deep')
  })

  it('rejects unknown labels', () => {
    expect(() => toSizeTier('Huge')).toThrow()
    expect(() => toDifficultyTier('Impossible')).toThrow()
  })
})

describe('toBoardParams', () => {
  it('builds engine params with the default clue set', () => {
    expect(toBoardParams(req())).toEqual({
      seed: 'CORAL-4417',
      size: 'Medium',
      difficulty: 'Tricky',
      clues: DEFAULT_CLUES,
    })
  })

  it('normalizes the seed to WORD-NNNN', () => {
    expect(toBoardParams(req({ seed: '  coral-4417 ' })).seed).toBe('CORAL-4417')
  })

  it('throws on an invalid seed', () => {
    expect(() => toBoardParams(req({ seed: 'not a seed!!' }))).toThrow()
  })

  it('throws on an invalid tier', () => {
    expect(() => toBoardParams({ ...req(), size: 'Huge' as BoardRequest['size'] })).toThrow()
  })
})

describe('isBoardRequest', () => {
  it('accepts a well-formed request', () => {
    expect(isBoardRequest(req())).toBe(true)
  })
  it('rejects malformed requests', () => {
    expect(isBoardRequest(null)).toBe(false)
    expect(isBoardRequest({ seed: 'x', size: 'Medium', difficulty: 'Tricky' })).toBe(false)
    expect(isBoardRequest({ seed: 'CORAL-4417', size: 'Huge', difficulty: 'Tricky' })).toBe(false)
  })
})

describe('launchBoard funnel', () => {
  it('returns a normalized, validated request', () => {
    expect(launchBoard(req({ seed: 'coral-4417' }))).toEqual({
      seed: 'CORAL-4417',
      size: 'Medium',
      difficulty: 'Tricky',
    })
  })
  it('throws on an invalid request rather than launching', () => {
    expect(() => launchBoard(req({ seed: 'garbled' }))).toThrow()
  })
})
