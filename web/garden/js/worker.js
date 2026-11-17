// @ts-check
import { createGarden } from "./garden.js";
import { meshVolume } from "./mesher.js";
self.onmessage = () => {
  try {
    const start = performance.now(),
      volume = createGarden();
    self.postMessage({ type: "progress", text: "正在雕刻屋瓦、花叶与池岸…" });
    const chunks = meshVolume(volume);
    const buffers = chunks.flatMap((c) => [
      c.opaque.vertices.buffer,
      c.opaque.indices.buffer,
      c.water.vertices.buffer,
      c.water.indices.buffer,
    ]);
    self.postMessage(
      {
        type: "ready",
        chunks,
        voxels: volume.count(),
        ms: performance.now() - start,
      },
      { transfer: buffers },
    );
  } catch (error) {
    self.postMessage({ type: "error", message: String(error) });
  }
};
