// @ts-check
import { VoxelVolume } from "./volume.js";
import { mulberry32 } from "./rng.js";
import { terrain } from "./scene/terrain.js";
import { house, bridge, torii, lantern, basin } from "./scene/architecture.js";
import { plants } from "./scene/plants.js";
/** Reproducible handcrafted composition; seed controls the small natural details. @param {number} [seed] */
export function createGarden(seed = 71823) {
  const volume = new VoxelVolume(240, 128, 176),
    rnd = mulberry32(seed);
  terrain(volume, rnd);
  house(volume, rnd);
  bridge(volume);
  torii(volume);
  lantern(volume, 66, 131);
  basin(volume);
  plants(volume, rnd);
  return volume;
}
