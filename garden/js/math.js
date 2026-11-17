// @ts-check
/** Minimal column-major mat4 / vec3 helpers (WebGL convention). */

/** @typedef {Float32Array} Mat4 */

export const mat4 = {
  /** @returns {Mat4} */
  create() {
    const m = new Float32Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
  },

  /** @param {Mat4} out @param {Mat4} a @param {Mat4} b */
  mul(out, a, b) {
    const r = new Float32Array(16);
    for (let c = 0; c < 4; c++)
      for (let row = 0; row < 4; row++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k * 4 + row] * b[c * 4 + k];
        r[c * 4 + row] = s;
      }
    out.set(r);
    return out;
  },

  /** @param {Mat4} out @param {number} fovy @param {number} aspect @param {number} near @param {number} far */
  perspective(out, fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    out.fill(0);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) / (near - far);
    out[11] = -1;
    out[14] = (2 * far * near) / (near - far);
    return out;
  },

  /** @param {Mat4} out @param {number} l @param {number} r @param {number} b @param {number} t @param {number} n @param {number} f */
  ortho(out, l, r, b, t, n, f) {
    out.fill(0);
    out[0] = 2 / (r - l);
    out[5] = 2 / (t - b);
    out[10] = -2 / (f - n);
    out[12] = -(r + l) / (r - l);
    out[13] = -(t + b) / (t - b);
    out[14] = -(f + n) / (f - n);
    out[15] = 1;
    return out;
  },

  /** @param {Mat4} out @param {number[]} eye @param {number[]} center @param {number[]} up */
  lookAt(out, eye, center, up) {
    const z = vec3.normalize(vec3.sub(eye, center));
    let x = vec3.cross(up, z);
    if (vec3.len(x) < 1e-6) x = vec3.cross([0, 0, 1], z);
    x = vec3.normalize(x);
    const y = vec3.cross(z, x);
    out[0] = x[0]; out[1] = y[0]; out[2] = z[0]; out[3] = 0;
    out[4] = x[1]; out[5] = y[1]; out[6] = z[1]; out[7] = 0;
    out[8] = x[2]; out[9] = y[2]; out[10] = z[2]; out[11] = 0;
    out[12] = -vec3.dot(x, eye); out[13] = -vec3.dot(y, eye); out[14] = -vec3.dot(z, eye); out[15] = 1;
    return out;
  },

  /** @param {Mat4} out @param {Mat4} m @returns {Mat4 | null} */
  invert(out, m) {
    const a = m, inv = new Float32Array(16);
    inv[0] = a[5] * a[10] * a[15] - a[5] * a[11] * a[14] - a[9] * a[6] * a[15] + a[9] * a[7] * a[14] + a[13] * a[6] * a[11] - a[13] * a[7] * a[10];
    inv[4] = -a[4] * a[10] * a[15] + a[4] * a[11] * a[14] + a[8] * a[6] * a[15] - a[8] * a[7] * a[14] - a[12] * a[6] * a[11] + a[12] * a[7] * a[10];
    inv[8] = a[4] * a[9] * a[15] - a[4] * a[11] * a[13] - a[8] * a[5] * a[15] + a[8] * a[7] * a[13] + a[12] * a[5] * a[11] - a[12] * a[7] * a[9];
    inv[12] = -a[4] * a[9] * a[14] + a[4] * a[10] * a[13] + a[8] * a[5] * a[14] - a[8] * a[6] * a[13] - a[12] * a[5] * a[10] + a[12] * a[6] * a[9];
    inv[1] = -a[1] * a[10] * a[15] + a[1] * a[11] * a[14] + a[9] * a[2] * a[15] - a[9] * a[3] * a[14] - a[13] * a[2] * a[11] + a[13] * a[3] * a[10];
    inv[5] = a[0] * a[10] * a[15] - a[0] * a[11] * a[14] - a[8] * a[2] * a[15] + a[8] * a[3] * a[14] + a[12] * a[2] * a[11] - a[12] * a[3] * a[10];
    inv[9] = -a[0] * a[9] * a[15] + a[0] * a[11] * a[13] + a[8] * a[1] * a[15] - a[8] * a[3] * a[13] - a[12] * a[1] * a[11] + a[12] * a[3] * a[9];
    inv[13] = a[0] * a[9] * a[14] - a[0] * a[10] * a[13] - a[8] * a[1] * a[14] + a[8] * a[2] * a[13] + a[12] * a[1] * a[10] - a[12] * a[2] * a[9];
    inv[2] = a[1] * a[6] * a[15] - a[1] * a[7] * a[14] - a[5] * a[2] * a[15] + a[5] * a[3] * a[14] + a[13] * a[2] * a[7] - a[13] * a[3] * a[6];
    inv[6] = -a[0] * a[6] * a[15] + a[0] * a[7] * a[14] + a[4] * a[2] * a[15] - a[4] * a[3] * a[14] - a[12] * a[2] * a[7] + a[12] * a[3] * a[6];
    inv[10] = a[0] * a[5] * a[15] - a[0] * a[7] * a[13] - a[4] * a[1] * a[15] + a[4] * a[3] * a[13] + a[12] * a[1] * a[7] - a[12] * a[3] * a[5];
    inv[14] = -a[0] * a[5] * a[14] + a[0] * a[6] * a[13] + a[4] * a[1] * a[14] - a[4] * a[2] * a[13] - a[12] * a[1] * a[6] + a[12] * a[2] * a[5];
    inv[3] = -a[1] * a[6] * a[11] + a[1] * a[7] * a[10] + a[5] * a[2] * a[11] - a[5] * a[3] * a[10] - a[9] * a[2] * a[7] + a[9] * a[3] * a[6];
    inv[7] = a[0] * a[6] * a[11] - a[0] * a[7] * a[10] - a[4] * a[2] * a[11] + a[4] * a[3] * a[10] + a[8] * a[2] * a[7] - a[8] * a[3] * a[6];
    inv[11] = -a[0] * a[5] * a[11] + a[0] * a[7] * a[9] + a[4] * a[1] * a[11] - a[4] * a[3] * a[9] - a[8] * a[1] * a[7] + a[8] * a[3] * a[5];
    inv[15] = a[0] * a[5] * a[10] - a[0] * a[6] * a[9] - a[4] * a[1] * a[10] + a[4] * a[2] * a[9] + a[8] * a[1] * a[6] - a[8] * a[2] * a[5];
    let det = a[0] * inv[0] + a[1] * inv[4] + a[2] * inv[8] + a[3] * inv[12];
    if (Math.abs(det) < 1e-12) return null;
    det = 1 / det;
    for (let i = 0; i < 16; i++) out[i] = inv[i] * det;
    return out;
  },

  /** @param {Mat4} out @param {number[]} t @param {number} yaw rotation about +y */
  translateRotateY(out, t, yaw) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    out.fill(0);
    out[0] = c; out[2] = -s;
    out[5] = 1;
    out[8] = s; out[10] = c;
    out[12] = t[0]; out[13] = t[1]; out[14] = t[2]; out[15] = 1;
    return out;
  },

  /** @param {Mat4} m @param {number[]} p @returns {number[]} clip-space xyzw */
  transform(m, p) {
    const [x, y, z] = p, w = p.length > 3 ? p[3] : 1;
    return [
      m[0] * x + m[4] * y + m[8] * z + m[12] * w,
      m[1] * x + m[5] * y + m[9] * z + m[13] * w,
      m[2] * x + m[6] * y + m[10] * z + m[14] * w,
      m[3] * x + m[7] * y + m[11] * z + m[15] * w,
    ];
  },
};

export const vec3 = {
  /** @param {number[]} a @param {number[]} b */
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  /** @param {number[]} a @param {number[]} b */
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  /** @param {number[]} a @param {number} s */
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  /** @param {number[]} a @param {number[]} b */
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  /** @param {number[]} a @param {number[]} b */
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  /** @param {number[]} a */
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  /** @param {number[]} a */
  normalize(a) {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
};

/**
 * Six frustum planes (a, b, c, d) extracted from a view-projection matrix.
 * @param {Mat4} m
 */
export function frustumPlanes(m) {
  const planes = [];
  for (const [i, s] of [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]]) {
    const p = [m[3] + s * m[i], m[7] + s * m[4 + i], m[11] + s * m[8 + i], m[15] + s * m[12 + i]];
    const l = Math.hypot(p[0], p[1], p[2]);
    planes.push(p.map((v) => v / l));
  }
  return planes;
}

/**
 * @param {number[][]} planes
 * @param {number[]} min
 * @param {number[]} max
 */
export function aabbVisible(planes, min, max) {
  for (const p of planes) {
    const x = p[0] > 0 ? max[0] : min[0];
    const y = p[1] > 0 ? max[1] : min[1];
    const z = p[2] > 0 ? max[2] : min[2];
    if (p[0] * x + p[1] * y + p[2] * z + p[3] < 0) return false;
  }
  return true;
}
