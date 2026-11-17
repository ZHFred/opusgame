// @ts-check
import { M } from "../palette.js";
/** Winding pond, shared by generation and animated koi. @param {number} z */
export const riverX = (z) => 137 + 19 * Math.sin(z / 34) - 0.05 * z;
/** @param {number} z */
export const riverWidth = (z) =>
  13 + 5 * Math.sin(z / 27) ** 2 + (z > 122 ? (z - 122) * 0.14 : 0);
export const WATER_Y = 15;
/** @param {import('../volume.js').VoxelVolume} v @param {() => number} rnd */
export function terrain(v, rnd) {
  for (let z = 4; z < v.d - 4; z++)
    for (let x = 4; x < v.w - 4; x++) {
      // A rounded, hand-cut slice of earth rather than an infinite plane.
      if (
        Math.hypot(
          Math.max(0, Math.abs(x - 120) - 104),
          Math.max(0, Math.abs(z - 86) - 70),
        ) > 10
      )
        continue;
      const bank = Math.abs(x - riverX(z)) - riverWidth(z);
      const y =
        bank < 0
          ? 10
          : 18 + Math.floor(Math.sin(x / 13) * Math.sin(z / 17) * 1.5);
      for (let h = 0; h <= y; h++)
        v.set(
          x,
          h,
          z,
          h === y
            ? bank < 0
              ? M.POND_BED
              : bank < 4
                ? M.MOSS_1
                : [M.GRASS_1, M.GRASS_2, M.GRASS_3][Math.floor(rnd() * 3)]
            : h < 4
              ? M.ROCK_LAYER
              : h < 8
                ? M.CLAY
                : M.SOIL,
        );
      if (bank < 0) for (let h = 11; h <= WATER_Y; h++) v.set(x, h, z, M.WATER);
      if (bank > -1 && bank < 3 && rnd() < 0.33)
        v.ellipsoid(x, y + 1, z, 2 + rnd() * 2, 1 + rnd() * 2, 2, M.STONE_DARK);
      // Gently curving gravel path, with an open ring around the water basin.
      const path = Math.abs(x - (45 + Math.sin(z / 25) * 10)) < 8 && z > 89;
      const ring = Math.abs(Math.hypot(x - 201, z - 128) - 20) < 6;
      if (bank > 5 && (path || ring))
        v.set(x, y, z, rnd() < 0.5 ? M.GRAVEL_1 : M.GRAVEL_2);
    }
  // Plaster garden wall: alternating masonry joints and a tiled coping.
  for (let x = 10; x < 231; x++) {
    if (x > 171 && x < 204) continue;
    v.box(x, 19, 9, x, 34, 12, (a, b) =>
      b < 23
        ? a % 10 === 0 || b % 4 === 0
          ? M.WALL_MORTAR
          : M.WALL_1
        : M.WALL_PLASTER,
    );
    v.box(x, 35, 7, x, 36, 14, x % 4 === 0 ? M.TILE_3 : M.WALL_CAP);
  }
  for (let z = 13; z < 80; z++) {
    v.box(231, 18, z, 233, 32, z, M.WALL_PLASTER);
    v.box(230, 33, z, 234, 34, z, M.WALL_CAP);
  }
  for (let i = 0; i < 10; i++) {
    const z = 97 + i * 6,
      x = 45 + Math.sin(z / 25) * 10;
    v.ellipsoid(x, 20, z, 6, 1, 3.5, i % 2 ? M.SLATE_1 : M.SLATE_2);
  }
}
