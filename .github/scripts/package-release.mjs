#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

if (process.argv.length > 3) {
  console.error("Usage: node .github/scripts/package-release.mjs [output-directory]");
  process.exit(2);
}
const root = fileURLToPath(new URL("../../", import.meta.url));
const output = resolve(process.argv[2] ?? "dist/release");
const readJSON = path => JSON.parse(readFileSync(path, "utf8"));
const pkg = readJSON(join(root, "package.json"));
const harnesses = ["claude", "codex", "pi", "omp", "antigravity", "gemini", "opencode", "cursor"];
if (process.env.RELEASE_TAG) {
  assert.equal(process.env.RELEASE_TAG, `v${pkg.version}`, "Release tag must match package.json version");
}
for (const path of [".claude-plugin/plugin.json", ".cursor-plugin/plugin.json", ".gemini/gemini-extension.json"]) {
  const manifest = readJSON(join(root, path));
  assert.equal(manifest.name, pkg.name, `${path}: native name differs from package.json`);
  assert.equal(manifest.version, pkg.version, `${path}: native version differs from package.json`);
}
assert.equal(readJSON(join(root, ".antigravity/plugin.json")).name, pkg.name,
  "Antigravity native plugin name differs from package.json (its manifest has no version)");

function run(command, args) {
  console.log(`$ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", cwd: root });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${command} failed with status ${result.status}`);
}

// A fresh release root prevents stale archives or package files from being published.
mkdirSync(dirname(output), { recursive: true });
mkdirSync(output);
const packages = join(output, "packages");
run(process.execPath, [join(root, "scripts/package.mjs"), "all", packages]);
for (const harness of harnesses) {
  const staged = join(packages, harness);
  const manifestPath = harness === "claude" ? ".claude-plugin/plugin.json"
    : harness === "cursor" ? ".cursor-plugin/plugin.json"
    : harness === "gemini" ? "gemini-extension.json"
    : harness === "antigravity" ? "plugin.json" : "package.json";
  const manifest = readJSON(join(staged, manifestPath));
  assert.equal(manifest.name, pkg.name, `${harness}: staged manifest name differs`);
  if (harness !== "antigravity") {
    assert.equal(manifest.version, pkg.version, `${harness}: staged manifest version differs`);
  }
  if (harness === "omp") assert.deepEqual(manifest.omp, {}, "OMP native manifest must remain minimal");
  run("tar", ["-czf", join(output, `scopewright-${harness}.tar.gz`), "-C", staged, "."]);
}
console.log(`Eight harness release archives staged at ${output}`);
