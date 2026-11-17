// @ts-check
import { M } from "../palette.js";
/** @typedef {import('../volume.js').VoxelVolume} Volume */
/** @param {Volume} v @param {() => number} rnd */
export function house(v, rnd) {
  v.box(22, 19, 28, 111, 23, 87, M.FOUNDATION);
  for (let x = 21; x <= 114; x += 3)
    v.box(x, 24, 27, x + 1, 25, 94, x % 2 ? M.WOOD : M.WOOD_MID);
  v.box(25, 26, 29, 108, 57, 31, M.PLASTER);
  v.box(25, 26, 31, 27, 56, 79, M.PLASTER);
  v.box(108, 26, 31, 110, 56, 79, M.PLASTER);
  v.box(26, 26, 77, 110, 54, 79, (x) => (x < 77 ? M.SHOJI : M.SHOJI_DIM));
  // Paper screens divided into delicate individual panels.
  for (let x = 28; x <= 108; x += 4) v.box(x, 27, 80, x, 54, 80, M.SHOJI_FRAME);
  for (let y = 28; y <= 54; y += 6) v.box(28, y, 80, 108, y, 80, M.SHOJI_FRAME);
  for (const x of [25, 52, 80, 108]) {
    v.box(x, 24, 28, x + 2, 59, 82, M.WOOD_DARK);
    v.box(x, 24, 90, x + 2, 59, 92, M.WOOD_DARK);
  }
  for (const y of [26, 55, 59]) v.box(23, y, 79, 112, y + 1, 82, M.WOOD_DARK);
  v.box(80, 27, 78, 97, 47, 81, M.WOOD_AGED);
  for (let x = 81; x < 97; x += 2) v.box(x, 28, 82, x, 45, 82, M.WOOD_DARK);
  v.box(79, 44, 83, 98, 52, 83, M.NOREN);
  v.box(88, 44, 83, 89, 49, 83, 0);
  v.box(84, 47, 84, 86, 49, 84, M.NOREN_MARK);
  // Hipped, layered kawara roof; each tile course has a raised seam.
  for (let z = 19; z <= 91; z++)
    for (let x = 14; x <= 122; x++) {
      const rise = Math.min(
        26,
        Math.min(z - 19, 91 - z) * 0.82,
        Math.min(x - 14, 122 - x) * 1.55,
      );
      const y = 60 + Math.floor(rise) + (Math.abs(z - 55) > 31 ? 1 : 0);
      const mat =
        x % 4 === 0 || z % 5 === 0
          ? M.TILE_3
          : rnd() < 0.45
            ? M.TILE_1
            : M.TILE_2;
      v.box(x, y - 2, z, x, y, z, mat);
      if (x % 4 === 0) v.set(x, y + 1, z, M.TILE_RIDGE);
    }
  v.box(32, 86, 54, 104, 88, 56, M.TILE_RIDGE);
  for (const x of [31, 105]) v.box(x, 87, 53, x + 2, 90, 57, M.TILE_2);
  // Entry steps and tea furniture.
  for (let i = 0; i < 3; i++)
    v.box(
      72 - i * 2,
      18 + i * 2,
      94 + i * 3,
      100 + i * 2,
      20 + i * 2,
      97 + i * 3,
      M.WOOD_AGED,
    );
  v.box(39, 31, 84, 57, 32, 92, M.TABLE);
  for (const x of [40, 55])
    for (const z of [85, 91]) v.box(x, 26, z, x + 1, 30, z + 1, M.TABLE);
  v.ellipsoid(47, 35, 88, 2.5, 2.5, 2.5, M.TEAPOT);
  v.capsule([48, 35, 88], [52, 36, 88], 1, 0.7, M.TEAPOT);
  for (const x of [41, 54]) {
    v.cylinder(x, 88, 1.5, 33, 34, M.CERAMIC);
    v.set(x, 35, 88, M.TEA);
  }
  v.box(32, 26, 88, 37, 27, 93, M.CUSHION);
  v.box(59, 26, 88, 64, 27, 93, M.CUSHION_2);
  // Curled orange cat on the warm porch, with ears, stripes and a white muzzle.
  v.ellipsoid(71, 28, 88, 5, 3, 3, M.CAT_1);
  v.ellipsoid(75, 30, 89, 2.5, 3, 2.5, M.CAT_1);
  v.box(73, 32, 88, 74, 34, 89, M.CAT_2);
  v.box(76, 32, 88, 77, 34, 89, M.CAT_2);
  v.box(74, 29, 91, 76, 30, 91, M.CAT_LIGHT);
  v.set(74, 31, 91, M.CAT_DARK);
  v.set(76, 31, 91, M.CAT_DARK);
  for (const x of [68, 71]) v.box(x, 30, 87, x, 30, 90, M.CAT_2);
  v.capsule([66, 27, 89], [65, 29, 93], 1, 1, M.CAT_2);
  // Brass telescope and tripod.
  v.capsule([103, 37, 87], [109, 43, 82], 1.5, 2, M.BRASS);
  v.ellipsoid(110, 44, 81, 2, 2, 1.5, M.GLASS);
  for (const a of [-3, 0, 3])
    v.capsule([104, 37, 86], [104 + a, 26, 89 + Math.abs(a)], 0.7, 0.7, M.IRON);
  // Eaves: suspended paper cranes and lanterns.
  const colors = [
    M.CRANE_RED,
    M.CRANE_YELLOW,
    M.CRANE_BLUE,
    M.CRANE_PINK,
    M.CRANE_WHITE,
    M.CRANE_GREEN,
  ];
  for (let i = 0; i < 6; i++) {
    const x = 34 + i * 11,
      y = 50 - (i % 3) * 2;
    v.box(x, y, 87, x, 59, 87, M.STRING);
    v.set(x, y - 1, 87, colors[i]);
    v.capsule([x - 3, y + 1, 87], [x, y - 1, 87], 0.6, 0.6, colors[i]);
    v.capsule([x, y - 1, 87], [x + 3, y + 2, 87], 0.6, 0.6, colors[i]);
  }
  for (const x of [29, 105]) {
    v.box(x, 47, 87, x, 58, 87, M.STRING);
    v.ellipsoid(x, 45, 87, 3, 5, 3, M.LAMP_PAPER);
    for (const y of [41, 45, 49])
      v.box(x - 2, y, 89, x + 2, y, 89, M.LAMP_FRAME);
  }
}
/** @param {Volume} v */
export function bridge(v) {
  for (let x = 93; x <= 160; x++) {
    const t = (x - 93) / 67,
      y = 21 + Math.round(Math.sin(t * Math.PI) * 10),
      z = 105 - (x - 93) * 0.15;
    v.box(
      x,
      y,
      z - 7,
      x,
      y + 1,
      z + 7,
      x % 3 === 0 ? M.WOOD_DARK : M.WOOD_BRIDGE,
    );
    for (const side of [-1, 1]) {
      const zz = z + side * 8;
      if ((x - 93) % 8 === 0)
        v.box(x, y - 2, zz, x + 1, y + 13, zz + 1, M.WOOD_RAIL);
      for (const h of [6, 12])
        v.box(x, y + h, zz, x + 1, y + h + 1, zz + 1, M.WOOD_MID);
    }
  }
}
/** @param {Volume} v */
export function torii(v) {
  // Set forward of the bamboo so the vermilion silhouette remains legible.
  for (const x of [176, 200]) {
    v.box(x, 18, 47, x + 3, 61, 50, M.TORII_RED);
    v.box(x - 1, 18, 46, x + 4, 23, 51, M.TORII_BLACK);
  }
  v.box(171, 50, 47, 208, 53, 50, M.TORII_RED);
  v.box(166, 61, 45, 212, 64, 52, M.TORII_RED);
  v.box(165, 65, 44, 213, 66, 53, M.TORII_BLACK);
  for (const x of [165, 210]) v.box(x, 66, 44, x + 3, 68, 53, M.TORII_BLACK);
  v.box(188, 53, 47, 190, 60, 50, M.TORII_BLACK);
  v.capsule([177, 48, 52], [199, 48, 52], 0.6, 0.6, M.ROPE);
  for (const x of [181, 188, 195]) {
    v.box(x, 44, 53, x, 47, 53, M.SHIDE);
    v.box(x + 1, 42, 53, x + 1, 44, 53, M.SHIDE);
  }
}
/** @param {Volume} v @param {number} x @param {number} z */
export function lantern(v, x, z) {
  v.ellipsoid(x, 20, z, 8, 2, 7, M.STONE_2);
  v.box(x - 2, 21, z - 2, x + 2, 32, z + 2, M.STONE_1);
  v.box(x - 5, 32, z - 5, x + 5, 34, z + 5, M.STONE_3);
  v.box(x - 3, 35, z - 3, x + 3, 42, z + 3, M.LANTERN_GLOW);
  for (const dx of [-4, 3])
    for (const dz of [-4, 3])
      v.box(x + dx, 35, z + dz, x + dx + 1, 43, z + dz + 1, M.STONE_DARK);
  for (let i = 0; i < 6; i++)
    v.box(
      x - 8 + i,
      44 + i,
      z - 8 + i,
      x + 8 - i,
      44 + i,
      z + 8 - i,
      M.STONE_2,
    );
  v.ellipsoid(x, 51, z, 2, 2, 2, M.STONE_3);
  v.ellipsoid(x - 3, 45, z + 2, 4, 1, 4, M.MOSS_2);
}
/** @param {Volume} v */
export function basin(v) {
  const x = 201,
    z = 128;
  v.ellipsoid(x, 22, z, 12, 7, 11, M.STONE_2);
  v.cylinder(x, z, 8, 24, 31, 0);
  v.cylinder(x, z, 7, 24, 25, M.WATER);
  v.capsule([217, 19, 120], [217, 41, 120], 1.5, 1.5, M.BAMBOO_PIPE);
  v.capsule([217, 40, 120], [203, 40, 126], 1.5, 1.5, M.BAMBOO_PIPE);
  v.capsule([203, 39, 126], [203, 26, 126], 0.6, 0.6, M.GLASS);
  v.capsule([190, 31, 132], [211, 31, 126], 0.8, 0.8, M.BAMBOO_CUT);
  v.ellipsoid(207, 32, 127, 3, 1.5, 2, M.BAMBOO_CUT);
  // A second small basin near the stone lantern.
  v.ellipsoid(30, 21, 126, 6, 4, 5, M.STONE_1);
  v.cylinder(30, 126, 4, 23, 25, M.WATER);
}
