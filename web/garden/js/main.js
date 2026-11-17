// @ts-check
import { OrbitCamera, attachControls } from "./camera.js";
import { Renderer } from "./renderer.js";
const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("garden")
);
const loading = /** @type {HTMLElement} */ (document.getElementById("loading"));
const progress = /** @type {HTMLElement} */ (
  document.getElementById("progress")
);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
/** @param {string} id */
const button = (id) =>
  /** @type {HTMLButtonElement} */ (document.getElementById(id));
/** @param {unknown} error */
function fail(error) {
  loading.hidden = true;
  const el = /** @type {HTMLElement} */ (document.getElementById("error"));
  el.hidden = false;
  /** @type {HTMLElement} */ (el.querySelector("p")).textContent =
    String(error);
  console.error(error);
  document.body.dataset.ready = "error";
}
/** @returns {Promise<{chunks:import('./mesher.js').ChunkMesh[],voxels:number,ms:number}>} */
async function build() {
  if (typeof Worker === "undefined") {
    const { createGarden } = await import("./garden.js"),
      { meshVolume } = await import("./mesher.js");
    await new Promise((resolve) => setTimeout(resolve, 32));
    const start = performance.now(),
      v = createGarden();
    return {
      chunks: meshVolume(v),
      voxels: v.count(),
      ms: performance.now() - start,
    };
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./worker.js", import.meta.url), {
      type: "module",
    });
    worker.onmessage = ({ data }) => {
      if (data.type === "progress") progress.textContent = data.text;
      if (data.type === "ready") {
        worker.terminate();
        resolve(data);
      }
      if (data.type === "error") {
        worker.terminate();
        reject(Error(data.message));
      }
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(Error(e.message));
    };
    worker.postMessage({ type: "build" });
  });
}
async function start() {
  // Check before spending time generating geometry on unsupported devices.
  if (
    !canvas.getContext("webgl2", {
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    })
  )
    throw Error("需要支持 WebGL2 的浏览器。请启用硬件加速后重试。");
  const data = await build(),
    renderer = new Renderer(canvas, data.chunks);
  renderer.paused = reduced;
  const camera = new OrbitCamera(
    { target: [113, 32, 88], yaw: 0.37, pitch: 0.59, distance: 660 },
    {
      minDist: 160,
      maxDist: 1100,
      bounds: { min: [0, 0, 0], max: [240, 128, 176] },
    },
  );
  /** Save from the current drawn frame, including on demand after tab resume. */
  function capture() {
    renderer.render(camera, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "yugure-garden.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }
  function sync() {
    button("orbit").setAttribute("aria-pressed", String(camera.autoOrbit));
    button("pause").setAttribute("aria-pressed", String(renderer.paused));
  }
  function toggleUI() {
    document.body.classList.toggle("clean");
    button("show-ui").hidden = !document.body.classList.contains("clean");
  }
  const tickControls = attachControls(canvas, camera, {
    onKey: (key) => {
      if (key === "h") toggleUI();
      if (key === "p") capture();
      requestAnimationFrame(sync);
    },
  });
  button("reset").onclick = () => {
    camera.autoOrbit = false;
    camera.reset();
    sync();
  };
  button("orbit").onclick = () => {
    camera.autoOrbit = !camera.autoOrbit;
    sync();
  };
  button("pause").onclick = () => {
    renderer.paused = !renderer.paused;
    sync();
  };
  button("capture").onclick = capture;
  button("show-ui").onclick = toggleUI;
  button("help").onclick = () => {
    const help = /** @type {HTMLElement} */ (
      document.getElementById("instructions")
    );
    help.hidden = !help.hidden;
    button("help").setAttribute("aria-expanded", String(!help.hidden));
  };
  /** @type {HTMLSelectElement} */ (
    document.getElementById("quality")
  ).onchange = (e) => {
    renderer.ratio = Number(/** @type {HTMLSelectElement} */ (e.target).value);
  };
  canvas.addEventListener("pointerdown", () => requestAnimationFrame(sync));
  canvas.addEventListener("wheel", () => requestAnimationFrame(sync), {
    passive: true,
  });
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    fail("图形上下文已丢失，请重新加载庭院。");
  });
  document.addEventListener("visibilitychange", () => {
    last = performance.now();
  });
  sync();
  let last = performance.now(),
    frames = 0;
  /** @param {number} now */
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (!document.hidden) {
      tickControls(dt);
      camera.aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
      // Fit portrait screens without cropping the entire island.
      camera.fov = Math.min(
        1.2,
        ((24 * Math.PI) / 180) * Math.max(1, 1.25 / camera.aspect),
      );
      camera.update(dt);
      renderer.render(camera, dt);
      if (++frames === 2) {
        loading.classList.add("done");
        document.body.dataset.ready = "true";
        document.body.dataset.quads = String(renderer.quads);
        document.body.dataset.voxels = String(data.voxels);
        console.info(
          `Garden ready: ${data.voxels} voxels, ${renderer.quads} quads, ${Math.round(data.ms)}ms generation`,
        );
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
start().catch(fail);
