import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const ROOT = new URL("../", import.meta.url).pathname;
const SKIPPED_DIRECTORIES = new Set([".git", "node_modules"]);
const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".md", ".mjs", ".svg", ".ts", ".txt", ".yaml", ".yml"]);

async function collectTextFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) files.push(...await collectTextFiles(join(directory, entry.name)));
      continue;
    }
    if (entry.isFile() && TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())) files.push(join(directory, entry.name));
  }
  return files;
}

test("repository text files are valid UTF-8 without NUL bytes", async () => {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const files = await collectTextFiles(ROOT);
  assert.ok(files.length > 0);
  for (const file of files) {
    const bytes = await readFile(file);
    const name = relative(ROOT, file);
    assert.equal(bytes.includes(0), false, `${name} contains a NUL byte`);
    assert.doesNotThrow(() => decoder.decode(bytes), `${name} is not valid UTF-8`);
  }
});
