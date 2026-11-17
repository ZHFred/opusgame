// @ts-check
import { M } from "./palette.js";

/** @typedef {number | ((x: number, y: number, z: number) => number)} Paint */

/**
 * Dense voxel grid of palette indices.
 * Axes: x = left→right, y = up, z = back→front (towards the default camera).
 */
export class VoxelVolume {
  /**
   * @param {number} w size along x
   * @param {number} h size along y
   * @param {number} d size along z
   */
  constructor(w, h, d) {
    this.w = w;
    this.h = h;
    this.d = d;
    this.data = new Uint8Array(w * h * d);
  }

  /** @param {number} x @param {number} y @param {number} z */
  index(x, y, z) {
    return (y * this.d + z) * this.w + x;
  }

  /** @param {number} x @param {number} y @param {number} z */
  inside(x, y, z) {
    return x >= 0 && y >= 0 && z >= 0 && x < this.w && y < this.h && z < this.d;
  }

  /** @param {number} x @param {number} y @param {number} z */
  get(x, y, z) {
    x |= 0; y |= 0; z |= 0;
    if (x < 0 || y < 0 || z < 0 || x >= this.w || y >= this.h || z >= this.d) return 0;
    return this.data[(y * this.d + z) * this.w + x];
  }

  /** @param {number} x @param {number} y @param {number} z @param {number} m */
  set(x, y, z, m) {
    x |= 0; y |= 0; z |= 0;
    if (x < 0 || y < 0 || z < 0 || x >= this.w || y >= this.h || z >= this.d) return;
    this.data[(y * this.d + z) * this.w + x] = m;
  }

  /** Writes only into air (or water when `overWater`). @param {number} x @param {number} y @param {number} z @param {number} m @param {boolean} [overWater] */
  fill(x, y, z, m, overWater = false) {
    const c = this.get(x, y, z);
    if (c === 0 || (overWater && c === M.WATER)) this.set(x, y, z, m);
  }

  /** @param {Paint} p @param {number} x @param {number} y @param {number} z */
  static paint(p, x, y, z) {
    return typeof p === "function" ? p(x, y, z) : p;
  }

  /**
   * Inclusive axis-aligned box.
   * @param {number} x0 @param {number} y0 @param {number} z0
   * @param {number} x1 @param {number} y1 @param {number} z1
   * @param {Paint} p
   * @param {{ onlyEmpty?: boolean }} [opts]
   */
  box(x0, y0, z0, x1, y1, z1, p, opts = {}) {
    const ax = Math.round(Math.min(x0, x1)), bx = Math.round(Math.max(x0, x1));
    const ay = Math.round(Math.min(y0, y1)), by = Math.round(Math.max(y0, y1));
    const az = Math.round(Math.min(z0, z1)), bz = Math.round(Math.max(z0, z1));
    for (let y = ay; y <= by; y++)
      for (let z = az; z <= bz; z++)
        for (let x = ax; x <= bx; x++) {
          if (opts.onlyEmpty && this.get(x, y, z) !== 0) continue;
          const m = VoxelVolume.paint(p, x, y, z);
          if (m >= 0) this.set(x, y, z, m);
        }
  }

  /**
   * Filled ellipsoid. Paint returning -1 skips a cell.
   * @param {number} cx @param {number} cy @param {number} cz
   * @param {number} rx @param {number} ry @param {number} rz
   * @param {Paint} p
   * @param {{ onlyEmpty?: boolean, shell?: number }} [opts] shell: only cells with normalised radius >= shell
   */
  ellipsoid(cx, cy, cz, rx, ry, rz, p, opts = {}) {
    const shell = opts.shell ?? 0;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++)
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, dz = (z + 0.5 - cz) / rz;
          const r2 = dx * dx + dy * dy + dz * dz;
          if (r2 > 1 || r2 < shell * shell) continue;
          if (opts.onlyEmpty && this.get(x, y, z) !== 0) continue;
          const m = VoxelVolume.paint(p, x, y, z);
          if (m >= 0) this.set(x, y, z, m);
        }
  }

  /**
   * Vertical cylinder.
   * @param {number} cx @param {number} cz @param {number} r
   * @param {number} y0 @param {number} y1 inclusive
   * @param {Paint} p
   * @param {{ onlyEmpty?: boolean }} [opts]
   */
  cylinder(cx, cz, r, y0, y1, p, opts = {}) {
    for (let y = Math.round(y0); y <= Math.round(y1); y++)
      for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++)
        for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
          const dx = x + 0.5 - cx, dz = z + 0.5 - cz;
          if (dx * dx + dz * dz > r * r) continue;
          if (opts.onlyEmpty && this.get(x, y, z) !== 0) continue;
          const m = VoxelVolume.paint(p, x, y, z);
          if (m >= 0) this.set(x, y, z, m);
        }
  }

  /**
   * Thick line segment (capsule) between two points.
   * @param {number[]} a @param {number[]} b
   * @param {number} r0 radius at a
   * @param {number} r1 radius at b
   * @param {Paint} p
   * @param {{ onlyEmpty?: boolean }} [opts]
   */
  capsule(a, b, r0, r1, p, opts = {}) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const len = Math.hypot(dx, dy, dz);
    const steps = Math.max(1, Math.ceil(len * 2));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const r = r0 + (r1 - r0) * t;
      const px = a[0] + dx * t, py = a[1] + dy * t, pz = a[2] + dz * t;
      if (r <= 0.75) {
        if (opts.onlyEmpty && this.get(px, py, pz) !== 0) continue;
        const m = VoxelVolume.paint(p, Math.floor(px), Math.floor(py), Math.floor(pz));
        if (m >= 0) this.set(Math.floor(px), Math.floor(py), Math.floor(pz), m);
      } else {
        this.ellipsoid(px, py, pz, r, r, r, p, opts);
      }
    }
  }

  /** Highest y holding a non-air voxel at column (x, z), or -1. @param {number} x @param {number} z @param {(m: number) => boolean} [accept] */
  top(x, z, accept) {
    for (let y = this.h - 1; y >= 0; y--) {
      const m = this.get(x, y, z);
      if (m !== 0 && (!accept || accept(m))) return y;
    }
    return -1;
  }

  /** Number of non-air voxels. */
  count() {
    let n = 0;
    const d = this.data;
    for (let i = 0; i < d.length; i++) if (d[i] !== 0) n++;
    return n;
  }
}

/**
 * Weighted random choice.
 * @template T
 * @param {() => number} rnd
 * @param {T[]} items
 * @param {number[]} [weights]
 * @returns {T}
 */
export function pick(rnd, items, weights) {
  if (!weights) return items[Math.floor(rnd() * items.length) % items.length];
  let total = 0;
  for (const w of weights) total += w;
  let r = rnd() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}
