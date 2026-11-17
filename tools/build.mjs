import { cp, mkdir, rm } from "node:fs/promises";
// A publishable static artifact, not a rewrite/transpile of the existing game.
await rm(new URL("../dist/", import.meta.url), {
  recursive: true,
  force: true,
});
await mkdir(new URL("../dist/", import.meta.url), { recursive: true });
await cp(
  new URL("../web/", import.meta.url),
  new URL("../dist/", import.meta.url),
  { recursive: true },
);
console.log("Static site built: dist/ (game + garden/)");
