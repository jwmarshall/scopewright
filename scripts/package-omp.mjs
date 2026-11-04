#!/usr/bin/env node
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(process.argv[2] ?? "dist/omp");
const { name, version, description, license } = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

// Refuse an existing destination so stale files cannot enter the package.
mkdirSync(dirname(output), { recursive: true });
mkdirSync(output);
writeFileSync(resolve(output, "package.json"), `${JSON.stringify({
  name, version, description, license,
  omp: {},
}, null, 2)}\n`);
for (const file of ["LICENSE", "skills"]) {
  cpSync(resolve(root, file), resolve(output, file), { recursive: true });
}
// Root agents/ belongs to the Claude plugin, not OMP's task-agent dialect.
cpSync(resolve(root, ".omp/agents"), resolve(output, "agents"), { recursive: true });
console.log(`OMP package staged at ${output}`);
