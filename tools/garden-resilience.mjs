import puppeteer from "puppeteer-core";
import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
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
const base = process.env.SITE_URL || "http://127.0.0.1:8080";
try {
  const game = await browser.newPage(),
    errors = [];
  game.on("pageerror", (e) => errors.push(String(e)));
  await game.goto(base + "/", { waitUntil: "networkidle0" });
  assert.ok((await game.title()).includes("OPUS"));
  assert.ok(await game.$("canvas"));
  assert.deepEqual(errors, []);
  const fallback = await browser.newPage(),
    fallbackErrors = [];
  fallback.on("pageerror", (e) => fallbackErrors.push(String(e)));
  await fallback.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  await fallback.evaluateOnNewDocument(() => {
    Object.defineProperty(window, "Worker", { value: undefined });
  });
  await fallback.goto(base + "/garden/", { waitUntil: "networkidle0" });
  await fallback.waitForFunction(() => document.body.dataset.ready, {
    timeout: 120000,
  });
  assert.equal(await fallback.$eval("body", (e) => e.dataset.ready), "true");
  assert.equal(
    await fallback.$eval("#pause", (e) => e.getAttribute("aria-pressed")),
    "true",
  );
  assert.deepEqual(fallbackErrors, []);
  const unsupported = await browser.newPage();
  await unsupported.evaluateOnNewDocument(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await unsupported.goto(base + "/garden/", { waitUntil: "networkidle0" });
  await unsupported.waitForFunction(
    () => document.body.dataset.ready === "error",
  );
  assert.equal(await unsupported.$eval("#error", (e) => e.hidden), false);
  assert.ok(
    (await unsupported.$eval("#error", (e) => e.textContent)).includes(
      "WebGL2",
    ),
  );
  await mkdir("artifacts", { recursive: true });
  const result = {
    originalGame: "title and canvas intact; no page errors",
    workerFallback: "renders successfully on main thread",
    reducedMotion: "animation paused by default",
    unsupportedWebGL: "actionable fallback is visible",
    errors,
    fallbackErrors,
  };
  await writeFile(
    "artifacts/resilience-report.json",
    JSON.stringify(result, null, 2),
  );
  console.log(result);
} finally {
  await browser.close();
}
