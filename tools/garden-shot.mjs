import puppeteer from "puppeteer-core";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: [
    "--no-sandbox",
    "--enable-webgl",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--disable-dev-shm-usage",
  ],
});
const errors = [],
  logs = [];
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    logs.push(m.text());
    if (m.type() === "error") errors.push(m.text());
  });
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await page.goto(process.env.GARDEN_URL || "http://127.0.0.1:8080/garden/", {
    waitUntil: "networkidle0",
  });
  await page.waitForFunction(() => document.body.dataset.ready, {
    timeout: 120000,
  });
  assert.equal(
    await page.evaluate(() => document.body.dataset.ready),
    "true",
    logs.join("\n"),
  );
  await page.click("#pause");
  await new Promise((r) => setTimeout(r, 1200));
  await mkdir("artifacts", { recursive: true });
  await page.screenshot({ path: "artifacts/garden-desktop.png" });
  const stats = await page.evaluate(() => ({
    voxels: document.body.dataset.voxels,
    quads: document.body.dataset.quads,
    canvas: [
      document.querySelector("canvas").width,
      document.querySelector("canvas").height,
    ],
  }));
  // Actual interactions, not only DOM presence.
  await page.click("#help");
  assert.equal(await page.$eval("#instructions", (e) => e.hidden), false);
  await page.click("#orbit");
  assert.equal(
    await page.$eval("#orbit", (e) => e.getAttribute("aria-pressed")),
    "true",
  );
  await page.click("#reset");
  assert.equal(
    await page.$eval("#orbit", (e) => e.getAttribute("aria-pressed")),
    "false",
  );
  await page.keyboard.press("h");
  assert.equal(
    await page.$eval("body", (e) => e.classList.contains("clean")),
    true,
  );
  await page.keyboard.press("h");
  await page.mouse.move(800, 450);
  await page.mouse.down();
  await page.mouse.move(880, 480, { steps: 6 });
  await page.mouse.up();
  await page.mouse.wheel({ deltaY: -130 });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: "artifacts/garden-orbit.png" });
  await page.click("#reset");
  await page.click("#help");
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: "artifacts/garden-mobile.png" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  const glError = await page.evaluate(() =>
    document.querySelector("canvas").getContext("webgl2").getError(),
  );
  assert.equal(glError, 0);
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/browser-report.json",
    JSON.stringify(
      {
        stats,
        errors,
        logs,
        interactions:
          "help, orbit, reset, hide UI, drag, wheel, portrait resize",
        glError,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ stats, errors, glError }));
} finally {
  await browser.close();
}
