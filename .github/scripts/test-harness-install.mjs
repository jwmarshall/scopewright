#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const harnesses = ["claude", "codex", "pi", "omp", "antigravity", "gemini", "opencode", "cursor"];
const [selected, mode] = process.argv.slice(2);
if ((!harnesses.includes(selected) && selected !== "all") ||
    (mode !== undefined && !["--build-only", "--run-only"].includes(mode)) || process.argv.length > 4) {
  console.error(`Usage: node .github/scripts/test-harness-install.mjs <${harnesses.join("|")}|all> [--build-only|--run-only]`);
  process.exit(2);
}
const root = fileURLToPath(new URL("../../", import.meta.url));
const engine = process.env.CONTAINER_ENGINE || "docker";
function run(args) {
  console.log(`$ ${engine} ${args.join(" ")}`);
  const result = spawnSync(engine, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

for (const harness of selected === "all" ? harnesses : [selected]) {
  const image = `scopewright-install-smoke:${harness}`;
  if (mode !== "--run-only") {
    // Only this small directory is sent as build context; no checkout, credentials, or .git enter images.
    run(["build", "--platform", "linux/amd64", "--build-arg", `HARNESS=${harness}`,
      "--target", "smoke", "--tag", image, join(root, "tests", "harnesses")]);
  }
  if (mode !== "--build-only") {
    run(["run", "--rm", "--platform", "linux/amd64", "--network", "none", "--read-only",
      "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
      "--tmpfs", "/tmp:rw,exec,mode=1777", "--tmpfs", "/home/node:rw,exec,mode=1777",
      "--mount", `type=bind,source=${root},target=/package,readonly`, image]);
  }
}
