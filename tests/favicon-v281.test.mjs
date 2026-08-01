import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url));
const text = (path) => read(path).toString("utf8");
const pngSize = (path) => {
  const png = read(path);
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
};

test("the supplied Beyond The Visa logo is the site favicon", () => {
  const html = text("web/index.html");
  const runtime = text("web/release-v68.js");
  assert.match(html, /rel="icon" type="image\/png" href="\/login-logo-v72\.png\?v=281"/);
  assert.match(html, /rel="apple-touch-icon" href="\/favicon-192-v281\.png\?v=281"/);
  assert.match(html, /rel="manifest" href="\/manifest\.json\?v=281"/);
  assert.match(runtime, /login-logo-v72\.png\?v=281/);
  assert.doesNotMatch(runtime, /brand-emblem-v68\.png/);
});

test("installable app icons use correctly sized versions of the new logo", () => {
  const manifest = JSON.parse(text("web/manifest.json"));
  assert.deepEqual(pngSize("web/favicon-192-v281.png"), [192, 192]);
  assert.deepEqual(pngSize("web/favicon-512-v281.png"), [512, 512]);
  assert.equal(manifest.icons[0].src, "/favicon-192-v281.png");
  assert.equal(manifest.icons[1].src, "/favicon-512-v281.png");
});
