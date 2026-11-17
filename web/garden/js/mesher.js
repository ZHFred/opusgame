// @ts-check
import { M } from "./palette.js";

/**
 * Chunked greedy mesher with per-vertex ambient occlusion.
 *
 * Vertex layout (4 × u16 = 8 bytes): x, y, z, packed
 *   packed = material (8 bits) | normal index (3 bits) << 8 | ao (2 bits) << 11
 * Normal index: 0 +x, 1 -x, 2 +y, 3 -y, 4 +z, 5 -z. ao: 0 (fully occluded) … 3 (open).
 *
 * Two faces are merged only when material and all four corner AO values match, so
 * merging never changes the shading — it only reduces the vertex count.
 */

export const CHUNK = 32;

/** @typedef {{ vertices: Uint16Array, indices: Uint32Array, quads: number }} MeshData */
/** @typedef {{ cx: number, cy: number, cz: number, min: number[], max: number[], opaque: MeshData, water: MeshData }} ChunkMesh */

class Builder {
  constructor() {
    this.v = new Uint16Array(4096);
    this.i = new Uint32Array(6144);
    this.nv = 0;
    this.ni = 0;
    this.quads = 0;
  }

  /** @param {number} nv @param {number} ni */
  reserve(nv, ni) {
    if ((this.nv + nv) * 4 > this.v.length) {
      const n = new Uint16Array(Math.max(this.v.length * 2, (this.nv + nv) * 4));
      n.set(this.v);
      this.v = n;
    }
    if (this.ni + ni > this.i.length) {
      const n = new Uint32Array(Math.max(this.i.length * 2, this.ni + ni));
      n.set(this.i);
      this.i = n;
    }
  }

  /** @returns {MeshData} */
  finish() {
    return { vertices: this.v.slice(0, this.nv * 4), indices: this.i.slice(0, this.ni), quads: this.quads };
  }
}

/** @param {number} m */
export const isOpaque = (m) => m !== 0 && m !== M.WATER;

/**
 * Meshes one chunk of a volume.
 * @param {import('./volume.js').VoxelVolume} vol
 * @param {number} ox chunk origin x
 * @param {number} oy chunk origin y
 * @param {number} oz chunk origin z
 * @param {number} [size]
 * @returns {{ opaque: MeshData, water: MeshData }}
 */
export function meshChunk(vol, ox, oy, oz, size = CHUNK) {
  const W = vol.w, H = vol.h, D = vol.d, data = vol.data;
  const ex = [Math.min(size, W - ox), Math.min(size, H - oy), Math.min(size, D - oz)];
  const origin = [ox, oy, oz];

  /** @param {number} x @param {number} y @param {number} z */
  const at = (x, y, z) => (x < 0 || y < 0 || z < 0 || x >= W || y >= H || z >= D ? 0 : data[(y * D + z) * W + x]);
  /** @param {number} x @param {number} y @param {number} z */
  const solid = (x, y, z) => {
    const m = at(x, y, z);
    return m !== 0 && m !== M.WATER ? 1 : 0;
  };

  const opaque = new Builder();
  const water = new Builder();
  const p = [0, 0, 0];
  const q = [0, 0, 0];
  const maxS = Math.max(ex[0], ex[1], ex[2]);
  const maskO = new Int32Array(maxS * maxS);
  const maskW = new Int32Array(maxS * maxS);

  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3, v = (d + 2) % 3;
    const su = ex[u], sv = ex[v];
    for (let dir = 1; dir >= -1; dir -= 2) {
      const normal = d * 2 + (dir > 0 ? 0 : 1);
      q[0] = q[1] = q[2] = 0;
      q[d] = dir;
      for (let s = 0; s < ex[d]; s++) {
        const cd = origin[d] + s;
        const nd = cd + dir;
        // the bottom of the diorama is never visible
        if (d === 1 && nd < 0) continue;
        let any = false;
        for (let j = 0; j < sv; j++) {
          for (let i = 0; i < su; i++) {
            p[d] = cd; p[u] = origin[u] + i; p[v] = origin[v] + j;
            const a = data[(p[1] * D + p[2]) * W + p[0]];
            const k = j * su + i;
            maskO[k] = 0;
            maskW[k] = 0;
            if (a === 0) continue;
            const b = at(p[0] + q[0], p[1] + q[1], p[2] + q[2]);
            if (a === M.WATER) {
              if (b === 0) { maskW[k] = a | (0xff << 8); any = true; }
              continue;
            }
            if (b !== 0 && b !== M.WATER) continue;
            // AO samples live in the layer in front of the face
            const fx = p[0] + q[0], fy = p[1] + q[1], fz = p[2] + q[2];
            /** @param {number} du @param {number} dv */
            const occ = (du, dv) => {
              const t = [fx, fy, fz];
              t[u] += du; t[v] += dv;
              return solid(t[0], t[1], t[2]);
            };
            const uM = occ(-1, 0), uP = occ(1, 0), vM = occ(0, -1), vP = occ(0, 1);
            const ao = (/** @type {number} */ s1, /** @type {number} */ s2, /** @type {number} */ c) => (s1 && s2 ? 0 : 3 - (s1 + s2 + c));
            const a00 = ao(uM, vM, occ(-1, -1));
            const a10 = ao(uP, vM, occ(1, -1));
            const a11 = ao(uP, vP, occ(1, 1));
            const a01 = ao(uM, vP, occ(-1, 1));
            maskO[k] = a | (a00 << 8) | (a10 << 10) | (a11 << 12) | (a01 << 14);
            any = true;
          }
        }
        if (!any) continue;
        const plane = cd + (dir > 0 ? 1 : 0);
        emitGreedy(maskO, su, sv, opaque, d, u, v, dir, normal, plane, origin);
        emitGreedy(maskW, su, sv, water, d, u, v, dir, normal, plane, origin);
      }
    }
  }
  return { opaque: opaque.finish(), water: water.finish() };
}

/**
 * @param {Int32Array} mask
 * @param {number} su @param {number} sv
 * @param {Builder} out
 * @param {number} d @param {number} u @param {number} v
 * @param {number} dir @param {number} normal @param {number} plane
 * @param {number[]} origin
 */
function emitGreedy(mask, su, sv, out, d, u, v, dir, normal, plane, origin) {
  const pos = [0, 0, 0];
  for (let j = 0; j < sv; j++) {
    for (let i = 0; i < su; ) {
      const key = mask[j * su + i];
      if (key === 0) { i++; continue; }
      let w = 1;
      while (i + w < su && mask[j * su + i + w] === key) w++;
      let h = 1;
      outer: while (j + h < sv) {
        for (let k = 0; k < w; k++) if (mask[(j + h) * su + i + k] !== key) break outer;
        h++;
      }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) mask[(j + y) * su + i + x] = 0;

      const mat = key & 0xff;
      const isWater = ((key >> 8) & 0xff) === 0xff;
      const aoArr = isWater ? [3, 3, 3, 3] : [(key >> 8) & 3, (key >> 10) & 3, (key >> 12) & 3, (key >> 14) & 3];
      const u0 = origin[u] + i, v0 = origin[v] + j;
      const corners = [[u0, v0], [u0 + w, v0], [u0 + w, v0 + h], [u0, v0 + h]];
      out.reserve(4, 6);
      const base = out.nv;
      for (let c = 0; c < 4; c++) {
        pos[d] = plane; pos[u] = corners[c][0]; pos[v] = corners[c][1];
        const o = out.nv * 4;
        out.v[o] = pos[0]; out.v[o + 1] = pos[1]; out.v[o + 2] = pos[2];
        out.v[o + 3] = mat | (normal << 8) | (aoArr[c] << 11);
        out.nv++;
      }
      const flip = aoArr[0] + aoArr[2] > aoArr[1] + aoArr[3];
      const tri = flip ? [0, 1, 2, 0, 2, 3] : [1, 2, 3, 1, 3, 0];
      if (dir < 0) { const t = tri[1]; tri[1] = tri[2]; tri[2] = t; const t2 = tri[4]; tri[4] = tri[5]; tri[5] = t2; }
      for (let k = 0; k < 6; k++) out.i[out.ni++] = base + tri[k];
      out.quads++;
      i += w;
    }
  }
}

/**
 * Meshes a whole volume chunk by chunk, skipping empty chunks.
 * @param {import('./volume.js').VoxelVolume} vol
 * @param {(done: number, total: number) => void} [onProgress]
 * @returns {ChunkMesh[]}
 */
export function meshVolume(vol, onProgress) {
  /** @type {ChunkMesh[]} */
  const out = [];
  const nx = Math.ceil(vol.w / CHUNK), ny = Math.ceil(vol.h / CHUNK), nz = Math.ceil(vol.d / CHUNK);
  const total = nx * ny * nz;
  let done = 0;
  for (let cy = 0; cy < ny; cy++)
    for (let cz = 0; cz < nz; cz++)
      for (let cx = 0; cx < nx; cx++) {
        done++;
        const ox = cx * CHUNK, oy = cy * CHUNK, oz = cz * CHUNK;
        if (!chunkHasContent(vol, ox, oy, oz)) continue;
        const { opaque, water } = meshChunk(vol, ox, oy, oz);
        if (opaque.quads || water.quads) {
          out.push({
            cx, cy, cz,
            min: [ox, oy, oz],
            max: [Math.min(ox + CHUNK, vol.w), Math.min(oy + CHUNK, vol.h), Math.min(oz + CHUNK, vol.d)],
            opaque, water,
          });
        }
        if (onProgress) onProgress(done, total);
      }
  return out;
}

/** @param {import('./volume.js').VoxelVolume} vol @param {number} ox @param {number} oy @param {number} oz */
function chunkHasContent(vol, ox, oy, oz) {
  const x1 = Math.min(ox + CHUNK, vol.w), y1 = Math.min(oy + CHUNK, vol.h), z1 = Math.min(oz + CHUNK, vol.d);
  for (let y = oy; y < y1; y++)
    for (let z = oz; z < z1; z++) {
      const row = (y * vol.d + z) * vol.w;
      for (let x = ox; x < x1; x++) if (vol.data[row + x] !== 0) return true;
    }
  return false;
}
