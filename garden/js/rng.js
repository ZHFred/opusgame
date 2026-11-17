// @ts-check
/** Deterministic RNG and value-noise helpers shared by every scene builder. */

/**
 * Mulberry32 PRNG.
 * @param {number} seed
 * @returns {() => number} uniform in [0, 1)
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Integer hash of up to three coordinates to [0, 1).
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} [seed]
 */
export function hash3(x, y, z, seed = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2147483647) ^ Math.imul(seed | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** @param {number} t */
const fade = (t) => t * t * (3 - 2 * t);

/**
 * 2D value noise in [0, 1).
 * @param {number} x
 * @param {number} y
 * @param {number} [seed]
 */
export function noise2(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = fade(x - xi), yf = fade(y - yi);
  const a = hash3(xi, yi, 0, seed), b = hash3(xi + 1, yi, 0, seed);
  const c = hash3(xi, yi + 1, 0, seed), d = hash3(xi + 1, yi + 1, 0, seed);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}

/**
 * 3D value noise in [0, 1).
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} [seed]
 */
export function noise3(x, y, z, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
  /** @param {number} dx @param {number} dy @param {number} dz */
  const h = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz, seed);
  const x00 = h(0, 0, 0) + (h(1, 0, 0) - h(0, 0, 0)) * xf;
  const x10 = h(0, 1, 0) + (h(1, 1, 0) - h(0, 1, 0)) * xf;
  const x01 = h(0, 0, 1) + (h(1, 0, 1) - h(0, 0, 1)) * xf;
  const x11 = h(0, 1, 1) + (h(1, 1, 1) - h(0, 1, 1)) * xf;
  const y0 = x00 + (x10 - x00) * yf;
  const y1 = x01 + (x11 - x01) * yf;
  return y0 + (y1 - y0) * zf;
}

/**
 * Fractal 2D noise in roughly [0, 1).
 * @param {number} x
 * @param {number} y
 * @param {number} [octaves]
 * @param {number} [seed]
 */
export function fbm2(x, y, octaves = 4, seed = 0) {
  let sum = 0, amp = 0.5, norm = 0, f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += noise2(x * f, y * f, seed + i * 17) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} t
 */
export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * @param {number} v
 * @param {number} lo
 * @param {number} hi
 */
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/**
 * @param {number} e0
 * @param {number} e1
 * @param {number} x
 */
export function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}
