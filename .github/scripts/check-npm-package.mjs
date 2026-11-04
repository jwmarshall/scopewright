#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const harnesses = ["claude", "codex", "pi", "omp", "antigravity", "gemini", "opencode", "cursor"];
const skillRoot = harness => ["codex", "opencode", "cursor", "antigravity"].includes(harness) ? ".agents" : `.${harness}`;
const agentRoot = harness => harness === "antigravity" ? ".agents" : `.${harness}`;

function run(command, args, options = {}) {
  console.log(`$ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { encoding: "utf8", timeout: 120_000, maxBuffer: 16 * 1024 * 1024, ...options });
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${command} failed (${result.status}):\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

// Exported for the offline Docker runner: its npm installation is also from an actual tarball.
export function installPackedCLI(workspace, output = join(workspace, "artifacts")) {
  mkdirSync(output, { recursive: true });
  const home = join(workspace, "home");
  mkdirSync(home, { recursive: true });
  // Resolve node/npm beside the running runtime before HOME hides version-manager state.
  const env = { ...process.env, PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ""}`,
    HOME: home, npm_config_cache: join(workspace, "cache"),
    npm_config_userconfig: join(home, ".npmrc"), npm_config_globalconfig: join(home, "global.npmrc"),
    npm_config_audit: "false", npm_config_fund: "false", npm_config_update_notifier: "false" };
  const packed = JSON.parse(run("npm", ["pack", "--json", "--ignore-scripts", "--offline", "--pack-destination", output], { cwd: root, env }));
  assert.equal(packed.length, 1);
  const pack = packed[0];
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(pack.name, pkg.name);
  assert.equal(pack.version, pkg.version);
  if (process.env.RELEASE_TAG) assert.equal(process.env.RELEASE_TAG, `v${pkg.version}`, "Release tag must match npm version");
  assert.equal(pkg.name, "scopewright");
  assert.equal(pkg.bin.scopewright, "scripts/install.mjs");
  assert.equal(Object.keys(pkg.dependencies ?? {}).length, 0, "CLI must remain dependency-free");
  assert.equal(Object.keys(pkg.optionalDependencies ?? {}).length, 0, "CLI must remain dependency-free");
  assert.equal(Object.keys(pkg.scripts ?? {}).some(name => ["preinstall", "install", "postinstall", "prepare"].includes(name)), false,
    "Published CLI must not need installation lifecycle scripts");
  const allowed = /^(?:package\.json|README\.md|LICENSE|skills\/.+|agents\/.+|\.agents\/agents\/.+|\.(?:antigravity|claude|claude-plugin|codex|cursor|cursor-plugin|gemini|omp|opencode)\/.+|scripts\/(?:install|package|sync-agents)\.mjs|reference\/.+)$/;
  for (const file of pack.files) {
    assert.match(file.path, allowed, `Unexpected npm payload: ${file.path}`);
    assert.equal(file.path.split("/").includes(".."), false);
  }
  for (const file of ["scripts/install.mjs", "skills/scopewright-create/SKILL.md", "skills/root-prompt-reviewer/SKILL.md"]) {
    assert.ok(pack.files.some(item => item.path === file), `Packed artifact is missing ${file}`);
  }
  const artifact = join(output, pack.filename);
  const prefix = join(workspace, "prefix");
  run("npm", ["install", "--global", "--prefix", prefix, "--ignore-scripts", "--offline", "--no-audit", "--no-fund", artifact], { cwd: workspace, env });
  const bin = join(prefix, "bin", "scopewright");
  assert.equal(run(bin, ["--version"], { env }).trim(), pkg.version);
  assert.match(run(bin, ["--help"], { env }), /install/);
  // The installed executable must not need npm's download cache or the packed source.
  rmSync(join(workspace, "cache"), { recursive: true, force: true });
  return { artifact, bin, env, pkg };
}

function snapshot(directory, prefix = "") {
  const result = {};
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const relative = `${prefix}${entry}`;
    assert.equal(lstatSync(path).isSymbolicLink(), false);
    if (lstatSync(path).isDirectory()) Object.assign(result, snapshot(path, `${relative}/`));
    else result[relative] = createHash("sha256").update(readFileSync(path)).digest("hex");
  }
  return result;
}

function verifyProject({ bin, env, pkg }, harness, workspace) {
  const project = join(workspace, `project-${harness}`);
  mkdirSync(project);
  const args = ["--harness", harness, "--local", "--project", project];
  const skill = join(project, skillRoot(harness), "skills", "scopewright-create", "SKILL.md");
  const reference = join(skillRoot(harness), "skills", "scopewright-create", "references", "SCOPED_FRAMEWORK_V4.md");
  writeFileSync(join(project, "unrelated.txt"), "preserve me\n");
  run(bin, ["install", ...args], { env });
  assert.deepEqual(readFileSync(join(project, reference)), readFileSync(join(root, "skills/scopewright-create/references/SCOPED_FRAMEWORK_V4.md")));
  assert.ok(existsSync(join(project, ".scopewright/install.json")));
  const agent = `${agentRoot(harness)}/agents/root-prompt-reviewer.${harness === "codex" ? "toml" : "md"}`;
  if (harness !== "pi") {
    assert.deepEqual(readFileSync(join(project, agent)), readFileSync(join(root, agent)), `${harness} changed the generated agent body`);
  }
  const state = JSON.parse(readFileSync(join(project, ".scopewright/install.json"), "utf8"));
  assert.equal(state.format, 1);
  assert.deepEqual(state.harnesses, { [harness]: pkg.version });
  const installed = snapshot(project);
  for (const [file, resource] of Object.entries(state.files)) {
    assert.deepEqual(resource.harnesses, [harness], `${file}: wrong managed owner`);
    assert.equal(resource.hash, installed[file], `${file}: ownership hash differs from installed content`);
  }
  for (const name of harnesses.map(name => `.${name}`).concat(".agents", ".scopewright")) {
    assert.equal(existsSync(join(env.HOME, name)), false, `Project CLI wrote user-level ${name}`);
  }
  const before = snapshot(project);
  run(bin, ["update", ...args], { env });
  assert.deepEqual(snapshot(project), before, `${harness}: unchanged update must be stable`);
  writeFileSync(skill, `${readFileSync(skill, "utf8")}\nlocal edit\n`);
  const edited = snapshot(project);
  const conflict = spawnSync(bin, ["update", ...args], { encoding: "utf8", env });
  assert.ifError(conflict.error);
  assert.notEqual(conflict.status, 0, `${harness}: update overwrote a local edit`);
  assert.deepEqual(snapshot(project), edited, `${harness}: conflict modified the project`);
  const unmanaged = join(workspace, `unmanaged-${harness}`);
  mkdirSync(dirname(join(unmanaged, reference)), { recursive: true });
  writeFileSync(join(unmanaged, reference), "user-owned reference\n");
  const unmanagedBefore = snapshot(unmanaged);
  const refusal = spawnSync(bin, ["install", "--harness", harness, "--local", "--project", unmanaged], { encoding: "utf8", env });
  assert.ifError(refusal.error);
  assert.notEqual(refusal.status, 0, `${harness}: install adopted an unmanaged file`);
  assert.deepEqual(snapshot(unmanaged), unmanagedBefore, `${harness}: install conflict modified the project`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv.length <= 3, "Usage: node .github/scripts/check-npm-package.mjs [artifact-directory]");
  const workspace = mkdtempSync(join(tmpdir(), "scopewright-npm-"));
  try {
    const installed = installPackedCLI(workspace, resolve(process.argv[2] ?? "dist/npm"));
    for (const harness of harnesses) verifyProject(installed, harness, workspace);
    console.log(`Verified packed npm CLI for all eight harnesses: ${installed.artifact}`);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}
