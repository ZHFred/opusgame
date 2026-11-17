import { test } from "node:test";
import assert from "node:assert/strict";
import { VoxelVolume } from "../web/garden/js/volume.js";
import { meshChunk, meshVolume } from "../web/garden/js/mesher.js";
import { M } from "../web/garden/js/palette.js";

/** @param {Uint16Array} v */
const decode = (v) => {
  const out = [];
  for (let i = 0; i < v.length; i += 4) out.push({ x: v[i], y: v[i + 1], z: v[i + 2], mat: v[i + 3] & 255, n: (v[i + 3] >> 8) & 7, ao: (v[i + 3] >> 11) & 3 });
  return out;
};

test("single voxel produces 6 quads (bottom kept above y=0)", () => {
  const vol = new VoxelVolume(4, 4, 4);
  vol.set(1, 1, 1, M.STONE_1);
  const { opaque, water } = meshChunk(vol, 0, 0, 0);
  assert.equal(opaque.quads, 6);
  assert.equal(opaque.indices.length, 36);
  assert.equal(water.quads, 0);
  for (const v of decode(opaque.vertices)) {
    assert.equal(v.mat, M.STONE_1);
    assert.equal(v.ao, 3);
  }
});

test("bottom face at y=0 is culled", () => {
  const vol = new VoxelVolume(4, 4, 4);
  vol.set(1, 0, 1, M.STONE_1);
  assert.equal(meshChunk(vol, 0, 0, 0).opaque.quads, 5);
});

test("flat slab of one material greedy-merges to one quad per side", () => {
  const vol = new VoxelVolume(16, 4, 16);
  vol.box(0, 1, 0, 15, 1, 15, M.GRASS_1);
  const { opaque } = meshChunk(vol, 0, 0, 0);
  assert.equal(opaque.quads, 6);
});

test("different materials are not merged", () => {
  const vol = new VoxelVolume(8, 4, 8);
  vol.box(0, 1, 0, 7, 1, 7, (x) => (x < 4 ? M.GRASS_1 : M.MOSS_1));
  const top = decode(meshChunk(vol, 0, 0, 0).opaque.vertices).filter((v) => v.n === 2);
  assert.equal(top.length, 8);
});

test("internal faces are culled and AO darkens concave corners", () => {
  const vol = new VoxelVolume(8, 8, 8);
  vol.box(0, 1, 0, 7, 1, 7, M.STONE_1);
  vol.set(3, 2, 3, M.STONE_2);
  const verts = decode(meshChunk(vol, 0, 0, 0).opaque.vertices);
  const floorTop = verts.filter((v) => v.n === 2 && v.y === 2 && v.mat === M.STONE_1);
  assert.ok(floorTop.some((v) => v.ao < 3), "floor next to a block has occluded corners");
  assert.ok(floorTop.some((v) => v.ao === 3));
});

test("water produces a separate surface mesh and does not hide the bed", () => {
  const vol = new VoxelVolume(8, 8, 8);
  vol.box(0, 0, 0, 7, 1, 7, M.POND_BED);
  vol.box(0, 2, 0, 7, 3, 7, M.WATER);
  const { opaque, water } = meshChunk(vol, 0, 0, 0);
  const waterTop = decode(water.vertices).filter((v) => v.n === 2);
  assert.ok(waterTop.length >= 4);
  assert.ok(waterTop.every((v) => v.y === 4));
  const bedTop = decode(opaque.vertices).filter((v) => v.n === 2 && v.mat === M.POND_BED);
  assert.ok(bedTop.length >= 4, "pond bed visible under water");
});

test("meshVolume covers multiple chunks and skips empty ones", () => {
  const vol = new VoxelVolume(70, 40, 40);
  vol.set(1, 1, 1, M.STONE_1);
  vol.set(65, 35, 35, M.STONE_1);
  const chunks = meshVolume(vol);
  assert.equal(chunks.length, 2);
  assert.equal(chunks.reduce((a, c) => a + c.opaque.quads, 0), 12);
});

test("triangle winding faces outward", () => {
  const vol = new VoxelVolume(4, 4, 4);
  vol.set(1, 1, 1, M.STONE_1);
  const { opaque } = meshChunk(vol, 0, 0, 0);
  const v = opaque.vertices, idx = opaque.indices;
  const normals = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (let t = 0; t < idx.length; t += 3) {
    const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]].map((i) => [v[i * 4], v[i * 4 + 1], v[i * 4 + 2]]);
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const n = normals[(v[idx[t] * 4 + 3] >> 8) & 7];
    assert.ok(cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] > 0, "CCW toward normal");
  }
});
