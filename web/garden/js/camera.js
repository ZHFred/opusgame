// @ts-check
import { mat4, vec3 } from "./math.js";

/** @typedef {{ target: number[], yaw: number, pitch: number, distance: number }} View */

const TAU = Math.PI * 2;

/**
 * Orbit camera with a narrow field of view, so the diorama reads almost isometric
 * while still keeping a hint of perspective depth. All motion is damped.
 */
export class OrbitCamera {
  /** @param {View} home @param {{ minDist: number, maxDist: number, bounds: { min: number[], max: number[] } }} limits */
  constructor(home, limits) {
    this.home = structuredClone(home);
    this.limits = limits;
    /** @type {View} */
    this.goal = structuredClone(home);
    /** @type {View} */
    this.cur = structuredClone(home);
    this.fov = (24 * Math.PI) / 180;
    this.aspect = 16 / 9;
    this.near = 4;
    this.far = 4000;
    this.view = mat4.create();
    this.proj = mat4.create();
    this.viewProj = mat4.create();
    this.invViewProj = mat4.create();
    this.eye = [0, 0, 0];
    this.autoOrbit = false;
  }

  reset() {
    this.goal = structuredClone(this.home);
    // unwrap so the camera takes the short way home
    const d = this.cur.yaw - this.goal.yaw;
    this.cur.yaw = this.goal.yaw + (((d % TAU) + TAU + Math.PI) % TAU) - Math.PI;
  }

  /** @param {number} dYaw @param {number} dPitch */
  rotate(dYaw, dPitch) {
    this.goal.yaw += dYaw;
    this.goal.pitch = Math.min(1.35, Math.max(0.12, this.goal.pitch + dPitch));
  }

  /** @param {number} factor >1 zooms out */
  zoom(factor) {
    this.goal.distance = Math.min(this.limits.maxDist, Math.max(this.limits.minDist, this.goal.distance * factor));
  }

  /** Pans in screen space; dx, dy in fractions of the viewport height. @param {number} dx @param {number} dy */
  pan(dx, dy) {
    const g = this.goal;
    const span = 2 * g.distance * Math.tan(this.fov / 2);
    const right = [Math.cos(g.yaw), 0, -Math.sin(g.yaw)];
    const fwd = [Math.sin(g.yaw), 0, Math.cos(g.yaw)];
    g.target[0] += (-right[0] * dx + fwd[0] * -dy / Math.max(0.35, Math.sin(g.pitch))) * span;
    g.target[2] += (-right[2] * dx + fwd[2] * -dy / Math.max(0.35, Math.sin(g.pitch))) * span;
    const { min, max } = this.limits.bounds;
    g.target[0] = Math.min(max[0], Math.max(min[0], g.target[0]));
    g.target[2] = Math.min(max[2], Math.max(min[2], g.target[2]));
  }

  /** @param {number} dt seconds */
  update(dt) {
    if (this.autoOrbit) this.goal.yaw += dt * 0.08;
    const k = 1 - Math.exp(-dt * 7);
    const c = this.cur, g = this.goal;
    c.yaw += (g.yaw - c.yaw) * k;
    c.pitch += (g.pitch - c.pitch) * k;
    c.distance += (g.distance - c.distance) * k;
    for (let i = 0; i < 3; i++) c.target[i] += (g.target[i] - c.target[i]) * k;

    const cp = Math.cos(c.pitch);
    this.eye = [
      c.target[0] + Math.sin(c.yaw) * cp * c.distance,
      c.target[1] + Math.sin(c.pitch) * c.distance,
      c.target[2] + Math.cos(c.yaw) * cp * c.distance,
    ];
    this.near = Math.max(2, c.distance * 0.25);
    this.far = c.distance * 6 + 1500;
    mat4.lookAt(this.view, this.eye, c.target, [0, 1, 0]);
    mat4.perspective(this.proj, this.fov, this.aspect, this.near, this.far);
    mat4.mul(this.viewProj, this.proj, this.view);
    mat4.invert(this.invViewProj, this.viewProj);
  }

  /** Unit vector from the eye toward the target. */
  forward() {
    return vec3.normalize(vec3.sub(this.cur.target, this.eye));
  }
}

/**
 * Mouse, touch and keyboard bindings for an OrbitCamera.
 * @param {HTMLElement} el
 * @param {OrbitCamera} cam
 * @param {{ onKey?: (key: string) => void }} [hooks]
 */
export function attachControls(el, cam, hooks = {}) {
  /** @type {Map<number, { x: number, y: number, button: number }>} */
  const pointers = new Map();
  let pinchDist = 0;
  let pinchMid = [0, 0];

  el.addEventListener("contextmenu", (e) => e.preventDefault());
  el.addEventListener("pointerdown", (e) => {
    el.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, button: e.button });
    cam.autoOrbit = false;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      pinchMid = [(a.x + b.x) / 2, (a.y + b.y) / 2];
    }
  });
  const end = (/** @type {PointerEvent} */ e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchDist = 0;
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  el.addEventListener("lostpointercapture", end);
  el.addEventListener("pointermove", (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const h = el.clientHeight || 1;
    const dx = (e.clientX - p.x) / h, dy = (e.clientY - p.y) / h;
    p.x = e.clientX; p.y = e.clientY;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = [(a.x + b.x) / 2, (a.y + b.y) / 2];
      if (pinchDist > 0) cam.zoom(pinchDist / Math.max(1, dist));
      cam.pan((mid[0] - pinchMid[0]) / h, (mid[1] - pinchMid[1]) / h);
      pinchDist = dist;
      pinchMid = mid;
      return;
    }
    if (p.button === 2 || p.button === 1 || e.shiftKey) cam.pan(dx, dy);
    else cam.rotate(-dx * 3.2, dy * 2.2);
  });
  el.addEventListener("wheel", (e) => {
    e.preventDefault();
    cam.autoOrbit = false;
    cam.zoom(Math.exp(e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0012)));
  }, { passive: false });

  /** @type {Set<string>} */
  const held = new Set();
  window.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    const k = e.key.toLowerCase();
    held.add(k);
    if (k.startsWith("arrow")) e.preventDefault();
    if (e.repeat) return;
    if (hooks.onKey) hooks.onKey(k);
    if (k === "r") cam.reset();
    if (k === " ") { cam.autoOrbit = !cam.autoOrbit; e.preventDefault(); }
  });
  window.addEventListener("keyup", (e) => held.delete(e.key.toLowerCase()));
  window.addEventListener("blur", () => held.clear());

  /** Continuous keyboard motion, called once per frame. @param {number} dt */
  return function tick(dt) {
    const s = dt * 0.9;
    if (held.has("a") || held.has("arrowleft")) cam.pan(-s, 0);
    if (held.has("d") || held.has("arrowright")) cam.pan(s, 0);
    if (held.has("w") || held.has("arrowup")) cam.pan(0, -s);
    if (held.has("s") || held.has("arrowdown")) cam.pan(0, s);
    if (held.has("q")) cam.rotate(dt * 1.2, 0);
    if (held.has("e")) cam.rotate(-dt * 1.2, 0);
    if (held.has("=") || held.has("+")) cam.zoom(1 - dt * 1.2);
    if (held.has("-")) cam.zoom(1 + dt * 1.2);
  };
}
