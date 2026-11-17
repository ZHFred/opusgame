// @ts-check
import { mat4, frustumPlanes, aabbVisible } from "./math.js";
import { paletteTextureData, M } from "./palette.js";
import { VoxelVolume } from "./volume.js";
import { meshChunk } from "./mesher.js";
import { riverX } from "./scene/terrain.js";
import { mulberry32 } from "./rng.js";
import * as S from "./shaders.js";
/** @typedef {import('./mesher.js').MeshData} MeshData */
/** @typedef {{vao:WebGLVertexArrayObject,count:number}} GPUMesh */
/** @param {WebGL2RenderingContext} gl @param {number} type @param {string} text */
function compile(gl, type, text) {
  const shader = gl.createShader(type);
  if (!shader) throw Error("Cannot allocate shader");
  gl.shaderSource(shader, text);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    throw Error(gl.getShaderInfoLog(shader) || "Shader failed");
  return shader;
}
/** @param {WebGL2RenderingContext} gl @param {string} vertex @param {string} fragment */
function program(gl, vertex, fragment) {
  const p = gl.createProgram();
  if (!p) throw Error("Cannot allocate program");
  const vs = compile(gl, gl.VERTEX_SHADER, vertex),
    fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw Error(gl.getProgramInfoLog(p) || "Program failed");
  return p;
}
/** Renderer owns a static mesh upload and one small animated fish mesh; no per-frame mesh generation. */
export class Renderer {
  /** @param {HTMLCanvasElement} canvas @param {import('./mesher.js').ChunkMesh[]} chunks */
  constructor(canvas, chunks) {
    const gl = canvas.getContext("webgl2", {
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) throw Error("此设备未启用 WebGL2，请启用硬件加速后重试。");
    this.gl = gl;
    this.canvas = canvas;
    this.ratio = 1.5;
    this.paused = false;
    this.time = 0;
    this.voxel = program(gl, S.voxelVertex, S.voxelFragment);
    this.depth = program(gl, S.depthVertex, S.depthFragment);
    this.sky = program(gl, S.skyVertex, S.skyFragment);
    this.petals = program(gl, S.petalVertex, S.petalFragment);
    this.petalVAO = gl.createVertexArray();
    gl.bindVertexArray(this.petalVAO);
    const seeds = new Float32Array(140 * 4),
      rnd = mulberry32(567);
    for (let i = 0; i < 140; i++) {
      const glow = i > 106;
      seeds.set(
        [
          glow ? 60 + rnd() * 145 : 102 + rnd() * 58,
          glow ? 23 + rnd() * 11 : 30 + rnd() * 70,
          glow ? 90 + rnd() * 62 : 18 + rnd() * 65,
          glow ? 0.78 + rnd() * 0.22 : rnd() * 0.75,
        ],
        i * 4,
      );
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);
    gl.bindVertexArray(null);
    this.identity = mat4.create();
    this.light = mat4.create();
    this.model = mat4.create();
    const view = mat4.create(),
      proj = mat4.create();
    mat4.lookAt(view, [-150, 380, 265], [120, 25, 88], [0, 1, 0]);
    mat4.ortho(proj, -185, 185, -170, 170, 10, 800);
    mat4.mul(this.light, proj, view);
    this.chunks = chunks.map((c) => ({
      ...c,
      opaque: this.upload(c.opaque),
      water: this.upload(c.water),
    }));
    this.quads = chunks.reduce((n, c) => n + c.opaque.quads + c.water.quads, 0);
    const fish = new VoxelVolume(9, 5, 16);
    fish.ellipsoid(4, 2, 7, 2, 1.5, 5, M.KOI_WHITE);
    fish.ellipsoid(4, 3, 6, 1.5, 0.8, 2, M.KOI_ORANGE);
    fish.box(3, 1, 11, 5, 2, 12, M.KOI_ORANGE);
    fish.box(2, 1, 13, 6, 2, 14, M.KOI_WHITE);
    fish.set(3, 2, 3, M.KOI_BLACK);
    fish.set(5, 2, 3, M.KOI_BLACK);
    this.fish = this.upload(meshChunk(fish, 0, 0, 0).opaque);
    this.palette = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.palette);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      256,
      2,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      paletteTextureData(),
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    this.shadow = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.shadow);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.DEPTH_COMPONENT24,
      2048,
      2048,
      0,
      gl.DEPTH_COMPONENT,
      gl.UNSIGNED_INT,
      null,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_COMPARE_MODE,
      gl.COMPARE_REF_TO_TEXTURE,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    this.framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.TEXTURE_2D,
      this.shadow,
      0,
    );
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
      throw Error("无法创建阴影缓冲区。");
    gl.viewport(0, 0, 2048, 2048);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.depth);
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.depth, "vp"),
      false,
      this.light,
    );
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1, 2);
    for (const c of this.chunks) this.draw(c.opaque);
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // Shadows are static: the only sway is sub-voxel and does not justify redrawing a 2K map every frame.
  }
  /** @param {MeshData} data @returns {GPUMesh} */
  upload(data) {
    const gl = this.gl,
      vao = gl.createVertexArray();
    if (!vao) throw Error("Cannot allocate mesh");
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, data.vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribIPointer(0, 4, gl.UNSIGNED_SHORT, 8, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, count: data.indices.length };
  }
  /** @param {GPUMesh} mesh */
  draw(mesh) {
    if (!mesh.count) return;
    const gl = this.gl;
    gl.bindVertexArray(mesh.vao);
    gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_INT, 0);
  }
  /** @param {import('./camera.js').OrbitCamera} camera @param {number} dt */
  render(camera, dt) {
    if (!this.paused) this.time += dt;
    const gl = this.gl,
      c = this.canvas,
      scale = Math.min(devicePixelRatio, this.ratio);
    const width = Math.max(1, Math.round(c.clientWidth * scale)),
      height = Math.max(1, Math.round(c.clientHeight * scale));
    if (c.width !== width || c.height !== height) {
      c.width = width;
      c.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.clearColor(0.7, 0.7, 0.65, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(this.sky);
    gl.bindVertexArray(null);
    gl.uniform2f(gl.getUniformLocation(this.sky, "resolution"), width, height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.useProgram(this.voxel);
    const u = (/** @type {string} */ name) =>
      gl.getUniformLocation(this.voxel, name);
    gl.uniformMatrix4fv(u("vp"), false, camera.viewProj);
    gl.uniformMatrix4fv(u("lightVP"), false, this.light);
    gl.uniformMatrix4fv(u("model"), false, this.identity);
    gl.uniform3fv(u("eye"), camera.eye);
    gl.uniform1f(u("time"), this.time);
    gl.uniform1f(u("animated"), 0);
    gl.uniform1f(u("waterPass"), 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.palette);
    gl.uniform1i(u("palette"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.shadow);
    gl.uniform1i(u("shadowMap"), 1);
    const planes = frustumPlanes(camera.viewProj),
      visible = this.chunks.filter((c) => aabbVisible(planes, c.min, c.max));
    for (const c of visible) this.draw(c.opaque);
    // Koi follow the pond's center line beneath a translucent water surface.
    gl.uniform1f(u("animated"), 1);
    for (let i = 0; i < 7; i++) {
      const z = 39 + ((i * 19 + this.time * 2.8) % 112),
        x = riverX(z) + Math.sin(z * 0.08 + i) * 6;
      mat4.translateRotateY(
        this.model,
        [x - 4, 12, z - 7],
        Math.atan2(riverX(z + 1) - riverX(z), 1),
      );
      gl.uniformMatrix4fv(u("model"), false, this.model);
      this.draw(this.fish);
    }
    gl.uniform1f(u("animated"), 0);
    gl.uniformMatrix4fv(u("model"), false, this.identity);
    gl.uniform1f(u("waterPass"), 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    // All water lies on horizontal planes. Back-to-front chunk order is sufficient here.
    visible
      .sort(
        (a, b) =>
          Math.hypot(...a.min.map((v, i) => v - camera.eye[i])) -
          Math.hypot(...b.min.map((v, i) => v - camera.eye[i])),
      )
      .reverse();
    for (const c of visible) this.draw(c.water);
    gl.useProgram(this.petals);
    gl.bindVertexArray(this.petalVAO);
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.petals, "vp"),
      false,
      camera.viewProj,
    );
    gl.uniform1f(gl.getUniformLocation(this.petals, "time"), this.time);
    gl.uniform1f(gl.getUniformLocation(this.petals, "pixelRatio"), scale);
    gl.drawArrays(gl.POINTS, 0, 140);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  }
}
