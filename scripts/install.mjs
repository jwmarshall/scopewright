#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import { chmodSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The same dependency-free entry point runs from npm, a checkout, or a project bundle.
const here = dirname(fileURLToPath(import.meta.url));
const root = basename(here) === "scripts" ? dirname(here) : here;
const harnesses = ["claude", "codex", "pi", "omp", "antigravity", "gemini", "opencode", "cursor"];
const usage = `Usage: scopewright <install|update> --harness <${harnesses.join("|")}> --local [--project <existing-directory>]
       scopewright --help | --version

Project scope only; --project defaults to the current directory. No global settings change.
Updates require a managed installation. Local edits and unmanaged collisions are refused.
Restart the harness after installation or updates. Native marketplace installs are managed separately.`;

function stat(path) {
  try { return lstatSync(path); }
  catch (error) { if (error.code === "ENOENT") return undefined; throw error; }
}

function hash(content) {
  return createHash("sha256").update(content).digest("hex");
}

function checkAncestors(path, base) {
  for (let current = path; ; current = dirname(current)) {
    const info = stat(current);
    if (info && (!info.isDirectory() || info.isSymbolicLink())) {
      throw new Error(`Destination ancestor must be a real directory: ${current}`);
    }
    if (current === base) break;
    if (dirname(current) === current) throw new Error(`Unsafe path outside ${base}: ${path}`);
  }
}

function regularFile(path) {
  const info = stat(path);
  if (info && (!info.isFile() || info.isSymbolicLink())) throw new Error(`Expected a regular file, not a symlink or directory: ${path}`);
  return info;
}

function destinations(harness) {
  const skills = ["codex", "opencode", "cursor", "antigravity"].includes(harness) ? ".agents/skills" : `.${harness}/skills`;
  const agents = harness === "pi" ? null : harness === "antigravity" ? ".agents/agents" : `.${harness}/agents`;
  return { skills, agents };
}

function resources(harness) {
  const result = new Map();
  const destination = destinations(harness);
  function walk(source, target) {
    checkAncestors(dirname(source), root);
    const info = lstatSync(source);
    if (info.isDirectory() && !info.isSymbolicLink()) {
      for (const entry of readdirSync(source).sort()) walk(join(source, entry), `${target}/${entry}`);
    } else if (info.isFile() && !info.isSymbolicLink()) {
      const content = readFileSync(source);
      result.set(target, { content, hash: hash(content) });
    } else {
      throw new Error(`Package resource must be a regular file or directory: ${source}`);
    }
  }
  for (const name of ["scopewright-create", "root-prompt-reviewer"]) {
    if (!regularFile(join(root, "skills", name, "SKILL.md"))) throw new Error(`Missing ${name} skill`);
    const references = join(root, "skills", name, "references");
    if (!lstatSync(references).isDirectory() || !readdirSync(references).length) throw new Error(`Missing skill references: ${references}`);
  }
  walk(join(root, "skills"), destination.skills);
  if (destination.agents) {
    const source = harness === "claude" ? "agents" : harness === "antigravity" ? ".agents/agents" : `.${harness}/agents`;
    const extension = harness === "codex" ? "toml" : "md";
    if (!regularFile(join(root, source, `root-prompt-reviewer.${extension}`))) throw new Error(`Missing ${harness} native reviewer`);
    walk(join(root, source), destination.agents);
  }
  if (!result.size) throw new Error("Package contains no installable resources");
  return result;
}

function readState(path) {
  if (!regularFile(path)) return { format: 1, harnesses: {}, files: {} };
  const state = JSON.parse(readFileSync(path, "utf8"));
  function object(value) { return value && typeof value === "object" && !Array.isArray(value); }
  if (state.format !== 1 || !object(state.harnesses) || !object(state.files)) throw new Error(`Invalid installation state: ${path}`);
  for (const [harness, version] of Object.entries(state.harnesses)) {
    if (!harnesses.includes(harness) || typeof version !== "string" || !version) throw new Error(`Invalid harness in installation state: ${harness}`);
  }
  for (const [file, resource] of Object.entries(state.files)) {
    if (file.includes("\\") || file.split("/").some(part => !part || part === "." || part === "..") || !object(resource) ||
        !/^[a-f0-9]{64}$/.test(resource.hash) || !Array.isArray(resource.harnesses) || !resource.harnesses.length ||
        new Set(resource.harnesses).size !== resource.harnesses.length) throw new Error(`Invalid installation state path: ${file}`);
    for (const owner of resource.harnesses) {
      if (!Object.hasOwn(state.harnesses, owner)) throw new Error(`Invalid installation state owner: ${file}`);
      const { skills, agents } = destinations(owner);
      if (![skills, agents].some(prefix => prefix && file.startsWith(`${prefix}/`))) throw new Error(`Unsafe installation state path: ${file}`);
    }
  }
  return state;
}

function install(command, harness, project, version) {
  const desired = resources(harness);
  const stateDirectory = join(project, ".scopewright");
  const statePath = join(stateDirectory, "install.json");
  const lock = join(stateDirectory, "lock");
  checkAncestors(stateDirectory, project);
  regularFile(statePath);
  if (command === "update" && !stat(statePath)) throw new Error(`No managed ${harness} installation; use install first`);
  let createdStateDirectory = false;
  let locked = false;
  const directories = [];
  const changes = [];
  const temporary = new Set();
  let completed = false;
  function ensureDirectory(path) {
    checkAncestors(path, project);
    if (stat(path)) return;
    ensureDirectory(dirname(path));
    mkdirSync(path);
    directories.push(path);
  }
  function atomicWrite(path, content, mode) {
    const temp = join(dirname(path), `.scopewright-${randomUUID()}.tmp`);
    temporary.add(temp);
    writeFileSync(temp, content, { flag: "wx", mode: mode ?? 0o644 });
    if (mode !== undefined) chmodSync(temp, mode);
    renameSync(temp, path);
    temporary.delete(temp);
  }
  try {
    if (!stat(stateDirectory)) {
      mkdirSync(stateDirectory);
      createdStateDirectory = true;
    }
    try { mkdirSync(lock); locked = true; }
    catch (error) {
      if (error.code === "EEXIST") throw new Error(`Installation lock exists: ${lock}. If no installer is running, remove this stale lock directory and retry.`);
      throw error;
    }
    const state = readState(statePath);
    if (command === "update" && !Object.hasOwn(state.harnesses, harness)) throw new Error(`${harness} is not installed by Scopewright; use install first`);
    const next = structuredClone(state);
    next.harnesses[harness] = version;
    const operations = new Map();
    for (const [file, incoming] of desired) {
      const owned = state.files[file];
      operations.set(file, incoming);
      next.files[file] = { hash: incoming.hash, harnesses: [...new Set([...(owned?.harnesses ?? []), harness])].sort() };
    }
    for (const [file, owned] of Object.entries(state.files)) {
      if (!owned.harnesses.includes(harness) || desired.has(file)) continue;
      const owners = owned.harnesses.filter(owner => owner !== harness);
      if (owners.length) next.files[file].harnesses = owners;
      else { operations.set(file, null); delete next.files[file]; }
    }
    // Preflight every replacement/removal before any skill, adapter, or state write.
    const before = new Map();
    for (const [file] of operations) {
      const path = join(project, file);
      checkAncestors(dirname(path), project);
      const info = regularFile(path);
      const content = info ? readFileSync(path) : undefined;
      const owned = state.files[file];
      if (info && !owned) throw new Error(`Refusing existing install destination (unmanaged): ${path}. Preserve it and move it aside before installing; there is no force mode.`);
      if (info && hash(content) !== owned.hash) throw new Error(`Locally modified file conflict: ${path}. Preserve your edits and restore the installed version before updating; there is no force mode.`);
      before.set(file, info ? { content, mode: info.mode } : null);
    }
    for (const [file, incoming] of operations) {
      const path = join(project, file);
      checkAncestors(dirname(path), project);
      const previous = before.get(file);
      const info = regularFile(path);
      if (Boolean(info) !== Boolean(previous) || (info && hash(readFileSync(path)) !== hash(previous.content))) throw new Error(`File changed during installation: ${path}`);
      if (incoming && previous && incoming.hash === hash(previous.content)) continue;
      if (incoming) {
        ensureDirectory(dirname(path));
        if (previous) atomicWrite(path, incoming.content, previous.mode);
        else writeFileSync(path, incoming.content, { flag: "wx" });
        changes.push({ path, previous });
      } else if (previous) {
        unlinkSync(path);
        changes.push({ path, previous });
      }
    }
    next.files = Object.fromEntries(Object.entries(next.files).sort(([a], [b]) => a.localeCompare(b)));
    atomicWrite(statePath, `${JSON.stringify(next, null, 2)}\n`);
    completed = true;
  } catch (error) {
    for (const { path, previous } of changes.reverse()) {
      try {
        checkAncestors(dirname(path), project);
        regularFile(path);
        if (previous) atomicWrite(path, previous.content, previous.mode);
        else unlinkSync(path);
      } catch (rollbackError) { console.error(`Could not restore ${path}: ${rollbackError.message}`); }
    }
    for (const path of directories.reverse()) {
      try { rmdirSync(path); }
      catch (cleanupError) { if (cleanupError.code !== "ENOTEMPTY") console.error(`Could not remove ${path}: ${cleanupError.message}`); }
    }
    throw error;
  } finally {
    for (const path of temporary) {
      try { unlinkSync(path); }
      catch (error) { if (error.code !== "ENOENT") console.error(`Could not remove ${path}: ${error.message}`); }
    }
    if (locked) rmdirSync(lock);
    if (createdStateDirectory && !completed) rmdirSync(stateDirectory);
  }
  console.log(`${command === "install" ? "Installed" : "Updated"} Scopewright ${version} for ${harness} in ${project}. Restart ${harness}.`);
}

function main() {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const args = process.argv.slice(2);
  if (args.length === 1 && ["--help", "-h"].includes(args[0])) { console.log(usage); return; }
  if (args.length === 1 && args[0] === "--version") { console.log(pkg.version); return; }
  const command = args.shift();
  if (!["install", "update"].includes(command)) throw new Error(usage);
  const options = new Map();
  while (args.length) {
    const flag = args.shift();
    if (!["--harness", "--project", "--local"].includes(flag) || options.has(flag)) throw new Error(`Unknown or repeated option: ${flag}\n${usage}`);
    if (flag === "--local") options.set(flag, true);
    else {
      const value = args.shift();
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}\n${usage}`);
      options.set(flag, value);
    }
  }
  const harness = options.get("--harness") ?? pkg.scopewright?.harness;
  if (!harnesses.includes(harness)) throw new Error(`Select a supported --harness\n${usage}`);
  if (pkg.scopewright?.harness && pkg.scopewright.harness !== harness) throw new Error(`This bundle supports only ${pkg.scopewright.harness}`);
  const project = realpathSync(resolve(options.get("--project") ?? "."));
  if (!lstatSync(project).isDirectory()) throw new Error(`Project must be an existing directory: ${project}`);
  install(command, harness, project, pkg.version);
}

try { main(); }
catch (error) { console.error(error.message); process.exitCode = 1; }
