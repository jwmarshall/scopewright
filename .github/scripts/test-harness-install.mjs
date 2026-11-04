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
// Portable npm CLIs can run natively on ARM; downloaded vendor archives are amd64-only.
// OMP_PLATFORM remains a more specific override because Bun can fail under amd64 emulation.
const defaultPlatform = process.env.HARNESS_PLATFORM || "linux/amd64";
const ompPlatform = process.env.OMP_PLATFORM || defaultPlatform;
for (const [name, value] of [["HARNESS_PLATFORM", defaultPlatform], ["OMP_PLATFORM", ompPlatform]]) {
  if (!["linux/amd64", "linux/arm64"].includes(value)) {
    throw new Error(`${name} must be linux/amd64 or linux/arm64`);
  }
}
const selectedHarnesses = selected === "all" ? harnesses : [selected];
if (defaultPlatform === "linux/arm64" && selectedHarnesses.some(name => ["antigravity", "cursor"].includes(name))) {
  throw new Error("Antigravity and Cursor use pinned amd64-only archives; select linux/amd64 for these harnesses");
}
function run(args) {
  console.log(`$ ${engine} ${args.join(" ")}`);
  const result = spawnSync(engine, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

for (const harness of selectedHarnesses) {
  const platform = harness === "omp" ? ompPlatform : defaultPlatform;
  const image = `scopewright-install-smoke:${harness}${platform === "linux/arm64" ? "-arm64" : ""}`;
  const baseArgs = platform === "linux/arm64" ? ["--build-arg",
    "NODE_IMAGE=node:22.22.0-bookworm-slim@sha256:5e22e6fb4448236070fdb260662e49fd58779876855baf95388534475c3dcd11"] : [];
  if (mode !== "--run-only") {
    // Only this small directory is sent as build context; no checkout, credentials, or .git enter images.
    run(["build", "--platform", platform, ...baseArgs, "--build-arg", `HARNESS=${harness}`,
      "--target", "smoke", "--tag", image, join(root, "tests", "harnesses")]);
  }
  if (mode !== "--build-only") {
    run(["run", "--rm", "--platform", platform, "--network", "none", "--read-only",
      "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
      "--tmpfs", "/tmp:rw,exec,mode=1777", "--tmpfs", "/home/node:rw,exec,mode=1777",
      "--mount", `type=bind,source=${root},target=/package,readonly`,
      // Reuse pinned dependency images while exercising the checkout's current smoke implementation.
      // Keep this path for official SDK imports to resolve against /opt/harness/node_modules.
      "--mount", `type=bind,source=${join(root, "tests", "harnesses", "smoke.mjs")},target=/opt/harness/smoke.mjs,readonly`,
      image]);
  }
}
