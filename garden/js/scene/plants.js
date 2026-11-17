// @ts-check
import { M } from "../palette.js";
import { noise3, hash3 } from "../rng.js";
import { riverX, riverWidth } from "./terrain.js";
/** @typedef {import('../volume.js').VoxelVolume} Volume */
/** @param {Volume} v @param {() => number} rnd @param {number} x @param {number} z @param {boolean} pink */
function tree(v, rnd, x, z, pink) {
  const base = 19,
    top = pink ? 99 : 89;
  const bark = pink ? M.BARK : M.MAPLE_BARK;
  const colors = pink
    ? [M.SAKURA_1, M.SAKURA_2, M.SAKURA_3, M.SAKURA_4]
    : [M.MAPLE_1, M.MAPLE_2, M.MAPLE_3, M.MAPLE_4];
  v.capsule([x, base, z], [x - 5, top - 19, z + 3], 4, 2, bark);
  for (let j = 0; j < 11; j++) {
    const a = j * 2.399,
      r = 10 + rnd() * 17,
      cx = x + Math.cos(a) * r,
      cz = z + Math.sin(a) * r,
      cy = top - 8 + rnd() * 14;
    v.capsule([x - 4, top - 27, z + 3], [cx, cy - 4, cz], 2, 0.7, bark);
    const rx = 12 + rnd() * 5,
      ry = 7 + rnd() * 5,
      rz = 10 + rnd() * 5;
    v.ellipsoid(cx, cy, cz, rx, ry, rz, (px, py, pz) => {
      const radial =
        ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 + ((pz - cz) / rz) ** 2;
      // Correlated three-dimensional noise breaks the smooth concentric shell.
      if (radial > 0.57 + noise3(px * 0.32, py * 0.38, pz * 0.32, 7) * 0.55)
        return -1;
      return colors[
        Math.min(3, Math.floor(noise3(px * 0.5, py * 0.5, pz * 0.5, 3) * 4))
      ];
    });
    for (let k = 0; k < 22; k++) {
      const px = cx + (rnd() - 0.5) * rx * 1.7,
        py = cy + (rnd() - 0.5) * ry,
        pz = cz + (rnd() - 0.5) * rz * 1.7;
      v.ellipsoid(
        px,
        py,
        pz,
        2.5,
        1.8,
        2.5,
        (a, b, c) => (hash3(a, b, c) > 0.12 ? colors[k % 4] : -1),
        { onlyEmpty: true },
      );
    }
    // Distinct hanging sprays rather than one solid canopy ball.
    for (let k = 0; k < 10; k++) {
      const px = cx + (rnd() - 0.5) * 22,
        pz = cz + (rnd() - 0.5) * 18,
        len = 5 + rnd() * (pink ? 16 : 5);
      v.capsule(
        [px, cy - 1, pz],
        [px + 2, cy - len, pz + 2],
        1.4,
        0.6,
        () => (rnd() < 0.2 ? -1 : colors[Math.floor(rnd() * 4)]),
        { onlyEmpty: true },
      );
    }
  }
}
/** @param {Volume} v @param {() => number} rnd */
export function plants(v, rnd) {
  tree(v, rnd, 119, 24, true);
  tree(v, rnd, 213, 54, false);
  // Bamboo grove rises between the wall and the gate.
  for (let i = 0; i < 31; i++) {
    const x = 153 + rnd() * 69,
      z = 13 + rnd() * 10,
      h = 50 + rnd() * 37;
    for (let y = 20; y < h; y++)
      v.box(
        x,
        y,
        z,
        x + 1,
        y,
        z + 1,
        y % 8 === 0 ? M.BAMBOO_NODE : i % 2 ? M.BAMBOO_1 : M.BAMBOO_2,
      );
    for (let j = 0; j < 6; j++) {
      const y = h - j * 5,
        dx = (j % 2 ? 1 : -1) * (5 + rnd() * 7);
      v.capsule([x, y, z], [x + dx, y + 3, z + 2], 0.6, 0.6, M.BAMBOO_NODE);
      v.ellipsoid(
        x + dx,
        y + 3,
        z + 2,
        5,
        1.3,
        3,
        j % 2 ? M.BAMBOO_LEAF_1 : M.BAMBOO_LEAF_2,
        { onlyEmpty: true },
      );
    }
  }
  // Wisteria spilling over the near eaves, framing—not covering—the paper windows.
  for (let i = 0; i < 65; i++) {
    const x = 17 + rnd() * 108,
      z = 87 + rnd() * 5,
      y = 59 + rnd() * 3,
      len = 5 + rnd() * 18;
    if (x > 54 && x < 95 && rnd() < 0.75) continue;
    v.ellipsoid(x, y, z, 4, 2, 3, M.VINE, { onlyEmpty: true });
    for (let h = 0; h < len; h++)
      v.ellipsoid(
        x + Math.sin(h / 5),
        y - h,
        z,
        Math.max(0.7, 2.2 - (h / len) * 1.5),
        1.4,
        1.2,
        h > len - 3
          ? M.WISTERIA_TIP
          : [M.WISTERIA_1, M.WISTERIA_2, M.WISTERIA_3][i % 3],
        { onlyEmpty: true },
      );
  }
  // Carefully grouped planting leaves paths and water legible.
  for (let i = 0; i < 2600; i++) {
    const x = 9 + rnd() * 220,
      z = 17 + rnd() * 143;
    const bank = Math.abs(x - riverX(z)) - riverWidth(z);
    if (
      bank < 3 ||
      (x > 17 && x < 124 && z < 100) ||
      (Math.abs(x - (45 + Math.sin(z / 25) * 10)) < 10 && z > 90) ||
      Math.hypot(x - 201, z - 128) < 27 ||
      (x > 91 && x < 164 && z > 88 && z < 116)
    )
      continue;
    const y = v.top(x, z) + 1;
    if (y < 18 || y > 24) continue;
    const kind = rnd();
    if (kind < 0.05) {
      v.ellipsoid(
        x,
        y + 2,
        z,
        3 + rnd() * 3,
        2 + rnd() * 3,
        3,
        kind < 0.025 ? M.SHRUB_1 : M.HYDRANGEA_1,
        { onlyEmpty: true },
      );
    } else if (kind < 0.15) {
      v.set(x, y, z, M.MUSH_STEM);
      v.ellipsoid(x, y + 2, z, 1.7, 1, 1.7, M.MUSH_RED);
      v.set(x, y + 3, z, M.MUSH_DOT);
    } else if (kind < 0.4) {
      const colors = [
        M.FLOWER_WHITE,
        M.FLOWER_YELLOW,
        M.FLOWER_PINK,
        M.FLOWER_BLUE,
        M.FLOWER_VIOLET,
      ];
      v.box(x, y, z, x, y + 2, z, M.REED);
      v.set(x, y + 3, z, colors[Math.floor(rnd() * 5)]);
    } else {
      for (let j = 0; j < 3; j++)
        v.capsule(
          [x, y, z],
          [x + (j - 1) * 2, y + 2 + rnd() * 3, z + 1],
          0.5,
          0.5,
          [M.TUFT_1, M.TUFT_2, M.FERN_1][j],
        );
    }
  }
  for (let i = 0; i < 23; i++) {
    const z = 31 + rnd() * 120,
      x = riverX(z) + (rnd() - 0.5) * riverWidth(z) * 1.3;
    if (z > 88 && z < 114) continue;
    v.cylinder(x, z, 2 + rnd() * 2, 16, 16, i % 2 ? M.LILYPAD_1 : M.LILYPAD_2);
    if (i % 3 === 0) {
      v.ellipsoid(x, 18, z, 1.8, 1.3, 1.8, M.LOTUS_PINK);
      v.set(x, 19, z, M.LOTUS_HEART);
    }
  }
  // Fallen petals gather on the moss and water.
  for (let i = 0; i < 190; i++) {
    const x = 93 + rnd() * 56,
      z = 26 + rnd() * 64,
      y = v.top(x, z);
    if (y < 25) v.set(x, y + 1, z, i % 2 ? M.SAKURA_2 : M.SAKURA_3);
  }
}
