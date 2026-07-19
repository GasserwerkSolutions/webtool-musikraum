import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

test("static entry loads the compiled Musikraum tool", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /type="module" src="assets\/main\.js"/);
  assert.match(html, /rel="icon" type="image\/svg\+xml" href="favicon\.svg"/);
  assert.match(html, /data-bind="site\.name"/);
});

test("product source contains no legacy vertical vocabulary", async () => {
  const roots = ["../src", "../assets"];
  const files = ["../index.html", "../styles.css", "../README.md"];
  for (const root of roots) for (const name of await readdir(new URL(root + "/", import.meta.url))) if (/\.(?:ts|js)$/.test(name)) files.push(`${root}/${name}`);
  const combined = (await Promise.all(files.map((path) => readFile(new URL(path, import.meta.url), "utf8")))).join("\n");
  assert.doesNotMatch(combined, /coiffeur|salon|hair|fashionhouse|staff|businessHours|workingHours|testimonial|bookable|priceType|bookingTitle/i);
});
