#!/usr/bin/env node
import assert from "node:assert/strict";
import { cpSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(process.argv[2] ?? "dist/antigravity");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const manifestPath = resolve(root, ".antigravity/plugin.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
assert.equal(manifest.name, pkg.name, "Antigravity plugin and package names must match");

// Refuse an existing destination so stale files cannot enter a release archive.
mkdirSync(dirname(output), { recursive: true });
mkdirSync(output);
cpSync(manifestPath, resolve(output, "plugin.json"));
for (const file of ["LICENSE", "skills"]) {
  cpSync(resolve(root, file), resolve(output, file), { recursive: true });
}
cpSync(resolve(root, ".agents/agents"), resolve(output, "agents"), { recursive: true });
console.log(`Antigravity plugin staged at ${output}`);
