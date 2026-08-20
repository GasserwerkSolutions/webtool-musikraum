import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);
const provenance = JSON.parse(await readFile(new URL("vendor/build-edit-core.provenance.json", ROOT), "utf8"));

for (const key of ["runtime", "declarations"]) {
  const entry = provenance[key];
  if (!entry || typeof entry.path !== "string" || !/^[0-9a-f]{64}$/.test(entry.sha256)) {
    throw new Error(`Invalid build-edit provenance entry: ${key}`);
  }
  const bytes = await readFile(new URL(`vendor/${entry.path}`, ROOT));
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== entry.sha256) throw new Error(`${entry.path}: expected ${entry.sha256}, got ${actual}`);
}

if (!/^[0-9a-f]{40}$/.test(provenance.sourceCommit)) throw new Error("build-edit sourceCommit must be a full Git SHA");
console.log(`verified build-edit ${provenance.sourceCommit} (${provenance.compilerVersion})`);
