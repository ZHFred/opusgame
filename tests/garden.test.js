import test from "node:test";
import assert from "node:assert/strict";
import { createGarden } from "../web/garden/js/garden.js";
import { M, MATERIALS } from "../web/garden/js/palette.js";
import { mulberry32 } from "../web/garden/js/rng.js";
import { VoxelVolume } from "../web/garden/js/volume.js";
import { mat4, frustumPlanes, aabbVisible } from "../web/garden/js/math.js";
import { OrbitCamera } from "../web/garden/js/camera.js";
import { riverX } from "../web/garden/js/scene/terrain.js";
test("garden is deterministic, bounded and contains every major landmark", () => {
  const a = createGarden(),
    b = createGarden();
  assert.deepEqual(a.data, b.data);
  assert.equal(a.data.length, 240 * 128 * 176);
  assert.ok(a.count() > 500000);
  const ids = new Set(a.data);
  for (const name of [
    "WATER",
    "SHOJI",
    "WISTERIA_1",
    "SAKURA_1",
    "MAPLE_1",
    "TORII_RED",
    "CAT_1",
    "TEAPOT",
    "BRASS",
    "LANTERN_GLOW",
    "BAMBOO_PIPE",
    "LILYPAD_1",
    "MUSH_RED",
  ])
    assert.ok(ids.has(M[name]), name);
  assert.ok(Math.max(...ids) < MATERIALS.length);
  assert.equal(a.get(0, 127, 0), 0);
  assert.equal(a.get(188, 62, 47), M.TORII_RED);
  assert.equal(a.get(201, 25, 128), M.WATER);
  assert.equal(a.get(Math.floor(riverX(150)), 14, 150), M.WATER);
});
test("RNG repeats and stays in range", () => {
  const a = mulberry32(17),
    b = mulberry32(17);
  for (let i = 0; i < 1000; i++) {
    const n = a();
    assert.equal(n, b());
    assert.ok(n >= 0 && n < 1);
  }
});
test("volume clips brushes and respects onlyEmpty", () => {
  const v = new VoxelVolume(8, 8, 8);
  v.box(-2, -2, -2, 1, 1, 1, M.STONE_1);
  assert.equal(v.count(), 8);
  v.box(0, 0, 0, 2, 2, 2, M.MOSS_1, { onlyEmpty: true });
  assert.equal(v.get(0, 0, 0), M.STONE_1);
  assert.equal(v.get(2, 2, 2), M.MOSS_1);
  assert.equal(v.top(2, 2), 2);
  v.set(-1, 0, 0, 9);
  assert.equal(v.get(-1, 0, 0), 0);
});
test("matrix inverse and frustum are consistent", () => {
  const m = mat4.create(),
    inv = mat4.create(),
    result = mat4.create();
  mat4.perspective(m, 0.6, 16 / 9, 2, 1000);
  mat4.invert(inv, m);
  mat4.mul(result, m, inv);
  const identity = mat4.create();
  for (let i = 0; i < 16; i++)
    assert.ok(Math.abs(result[i] - identity[i]) < 1e-5);
  const planes = frustumPlanes(m);
  assert.equal(aabbVisible(planes, [-1, -1, -20], [1, 1, -18]), true);
  assert.equal(aabbVisible(planes, [1000, 0, 10], [1010, 1, 20]), false);
});
test("orbit controls clamp distance, pitch and pan; reset takes shortest arc", () => {
  const home = { target: [10, 10, 10], yaw: 0.2, pitch: 0.6, distance: 200 };
  const c = new OrbitCamera(home, {
    minDist: 50,
    maxDist: 500,
    bounds: { min: [0, 0, 0], max: [20, 20, 20] },
  });
  c.zoom(0.0001);
  assert.equal(c.goal.distance, 50);
  c.zoom(1e8);
  assert.equal(c.goal.distance, 500);
  c.rotate(0, 100);
  assert.equal(c.goal.pitch, 1.35);
  c.pan(100, 100);
  assert.ok(c.goal.target.every((n) => n >= 0 && n <= 20));
  c.cur.yaw = 20 * Math.PI + 0.3;
  c.reset();
  assert.ok(Math.abs(c.cur.yaw - c.goal.yaw) < Math.PI);
  c.update(1);
  assert.ok([...c.viewProj].every(Number.isFinite));
});

test("thin capsules honor negative paint sentinel instead of wrapping to palette 255", () => {
  const v = new VoxelVolume(8, 8, 8);
  v.capsule([1, 1, 1], [6, 6, 6], 0.5, 0.5, () => -1);
  assert.equal(v.count(), 0);
});
