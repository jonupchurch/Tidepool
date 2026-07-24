// rng.ts — seeded, portable PRNG. `cyrb128` hashes a string seed into four
// 32-bit words; `sfc32` is the generator. All arithmetic is integer-stable
// (`>>> 0` / `Math.imul`) so sequences are identical across JS engines and
// platforms. No global state — an Rng is an explicit object threaded through
// generation. Never `Math.random` (Constitution XI).

export interface Rng {
  /** next unsigned 32-bit integer */
  nextU32(): number
}

/** cyrb128 string hash → four 32-bit seed words. */
export function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703
  let h2 = 3144134277
  let h3 = 1013904242
  let h4 = 2773480762
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i)
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067)
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233)
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213)
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179)
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067)
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233)
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213)
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179)
  h1 ^= h2 ^ h3 ^ h4
  h2 ^= h1
  h3 ^= h1
  h4 ^= h1
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0]
}

/** sfc32 generator over four 32-bit words. */
function sfc32(a: number, b: number, c: number, d: number): Rng {
  let s0 = a >>> 0
  let s1 = b >>> 0
  let s2 = c >>> 0
  let s3 = d >>> 0
  return {
    nextU32(): number {
      s0 |= 0
      s1 |= 0
      s2 |= 0
      s3 |= 0
      const t = (((s0 + s1) | 0) + s3) | 0
      s3 = (s3 + 1) | 0
      s0 = s1 ^ (s1 >>> 9)
      s1 = (s2 + (s2 << 3)) | 0
      s2 = (s2 << 21) | (s2 >>> 11)
      s2 = (s2 + t) | 0
      return t >>> 0
    },
  }
}

/** Deterministic PRNG from a string seed. */
export function seedToRng(seed: string): Rng {
  const [a, b, c, d] = cyrb128(seed)
  const rng = sfc32(a, b, c, d)
  // Discard a few outputs to wash out low-entropy seeds.
  for (let i = 0; i < 8; i++) rng.nextU32()
  return rng
}

/** Unbiased integer in [0, maxExclusive) via rejection sampling. */
export function nextInt(rng: Rng, maxExclusive: number): number {
  if (maxExclusive <= 0) throw new Error('nextInt: maxExclusive must be > 0')
  if (maxExclusive === 1) return 0
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive
  let x = rng.nextU32()
  while (x >= limit) x = rng.nextU32()
  return x % maxExclusive
}

/** Float in [0, 1). */
export function nextFloat(rng: Rng): number {
  return rng.nextU32() / 0x100000000
}

/** Deterministic in-place Fisher–Yates shuffle using the rng. */
export function shuffle<T>(rng: Rng, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = nextInt(rng, i + 1)
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}
