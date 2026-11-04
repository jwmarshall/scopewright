#!/usr/bin/env node
import assert from "node:assert/strict";
import { cpSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const harnesses = ["claude", "codex", "pi", "omp", "antigravity", "gemini", "opencode", "cursor"];
const nativeName = "scopewright";
const projectHarnesses = new Set(["codex", "opencode", "cursor"]);

function stat(path) {
  try { return lstatSync(path); }
  catch (error) { if (error.code === "ENOENT") return undefined; throw error; }
}

// Resolve explicitly selected parent aliases without following the output leaf.
function canonicalOutput(path) {
  const parent = dirname(path);
  if (parent === path) return realpathSync(path);
  return join(stat(parent) ? realpathSync(parent) : canonicalOutput(parent), basename(path));
}

function checkAncestors(path) {
  for (let current = path; ; current = dirname(current)) {
    const info = stat(current);
    if (info && (!info.isDirectory() || info.isSymbolicLink())) {
      throw new Error(`Destination ancestor must be a real directory: ${current}`);
    }
    if (dirname(current) === current) break;
  }
}

function checkSource(path) {
  const info = lstatSync(path);
  if (info.isSymbolicLink() || (!info.isDirectory() && !info.isFile())) {
    throw new Error(`Package source must be a regular file or directory: ${path}`);
  }
  if (info.isDirectory()) {
    for (const entry of readdirSync(path)) checkSource(join(path, entry));
  }
}

function readJson(path) {
  checkSource(resolve(root, path));
  return JSON.parse(readFileSync(resolve(root, path), "utf8"));
}

function plan(harness, pkg) {
  const copies = [["LICENSE", "LICENSE"], ["skills", "skills"]];
  const json = [];
  const metadata = { name: pkg.name, version: pkg.version, description: pkg.description, license: pkg.license };
  function manifest(source, destination, versioned = true) {
    const value = readJson(source);
    assert.equal(value.name, nativeName, `${harness} manifest must use the native plugin name`);
    if (versioned) assert.equal(value.version, pkg.version, `${harness} manifest and package versions must match`);
    json.push([destination, value]);
    return value;
  }
  switch (harness) {
    case "claude": {
      manifest(".claude-plugin/plugin.json", ".claude-plugin/plugin.json");
      const marketplace = manifest(".claude-plugin/marketplace.json", ".claude-plugin/marketplace.json", false);
      assert.ok(marketplace.plugins?.some(plugin => plugin.name === nativeName && plugin.source === "./"), "Claude marketplace must reference the local plugin");
      copies.push(["agents", "agents"]);
      break;
    }
    case "pi":
      json.push(["package.json", { ...metadata, pi: { skills: ["./skills"] } }]);
      break;
    case "omp":
      json.push(["package.json", { ...metadata, omp: {} }]);
      copies.push([".omp/agents", "agents"]);
      break;
    case "antigravity":
      manifest(".antigravity/plugin.json", "plugin.json", false);
      copies.push([".agents/agents", "agents"]);
      break;
    case "gemini":
      manifest(".gemini/gemini-extension.json", "gemini-extension.json");
      copies.push([".gemini/agents", "agents"]);
      break;
    default:
      assert.ok(projectHarnesses.has(harness));
      json.push(["package.json", { ...metadata, scopewright: { harness } }]);
      copies.push([`.${harness}/agents`, `.${harness}/agents`], ["scripts/install.mjs", "install.mjs"]);
      if (harness === "cursor") {
        const cursor = manifest(".cursor-plugin/plugin.json", ".cursor-plugin/plugin.json");
        const logo = resolve(root, cursor.logo);
        const localLogo = relative(root, logo);
        assert.ok(localLogo && !localLogo.startsWith("..") && !isAbsolute(localLogo), "Cursor logo must be inside the repository");
        assert.ok(lstatSync(logo).isFile(), "Cursor logo must be a regular file");
        copies.push([localLogo, ".cursor-plugin/icon.png"]);
        cursor.logo = ".cursor-plugin/icon.png";
      }
  }
  for (const [source] of copies) checkSource(resolve(root, source));
  for (const [source, destination] of copies) {
    if (destination === "agents" || destination.endsWith("/agents")) {
      const extension = harness === "codex" ? "toml" : "md";
      assert.ok(lstatSync(resolve(root, source, `root-prompt-reviewer.${extension}`)).isFile(), `Missing ${harness} native agent`);
    }
  }
  // Required canonical resources must be present before any output is created.
  for (const skill of ["scopewright-create", "root-prompt-reviewer"]) {
    assert.ok(lstatSync(resolve(root, "skills", skill, "SKILL.md")).isFile(), `Missing ${skill} skill`);
    assert.ok(lstatSync(resolve(root, "skills", skill, "references")).isDirectory(), `Missing ${skill} references`);
  }
  return { harness, copies, json };
}

function build(plan, output) {
  mkdirSync(output);
  for (const [source, destination] of plan.copies) {
    mkdirSync(dirname(join(output, destination)), { recursive: true });
    cpSync(resolve(root, source), join(output, destination), { recursive: true, force: false, errorOnExist: true });
  }
  for (const [destination, value] of plan.json) {
    mkdirSync(dirname(join(output, destination)), { recursive: true });
    writeFileSync(join(output, destination), `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
  }
}

function main() {
  const [harness, directory, ...extra] = process.argv.slice(2);
  if ((!harnesses.includes(harness) && harness !== "all") || extra.length) {
    throw new Error(`Usage: node scripts/package.mjs <${[...harnesses, "all"].join("|")}> [output-directory]`);
  }
  const requestedOutput = resolve(directory ?? (harness === "all" ? "dist" : `dist/${harness}`));
  if (stat(requestedOutput)?.isSymbolicLink()) throw new Error(`Refusing existing package destination: ${requestedOutput}`);
  const output = canonicalOutput(requestedOutput);
  const selected = harness === "all" ? harnesses : [harness];
  const pkg = readJson("package.json");
  const plans = selected.map(name => ({ ...plan(name, pkg), destination: harness === "all" ? join(output, name) : output }));
  for (const entry of plans) {
    if (stat(entry.destination)) throw new Error(`Refusing existing package destination: ${entry.destination}`);
    checkAncestors(dirname(entry.destination));
    for (const [source] of entry.copies) {
      const path = resolve(root, source);
      const inside = relative(path, entry.destination);
      assert.ok(!lstatSync(path).isDirectory() || inside.startsWith(`..${sep}`) || isAbsolute(inside), `Package destination cannot be inside its source: ${path}`);
    }
  }
  const parent = dirname(output);
  checkAncestors(parent);
  mkdirSync(parent, { recursive: true });
  const staging = mkdtempSync(join(parent, ".scopewright-package-"));
  const published = [];
  let createdOutput = false;
  try {
    for (const entry of plans) build(entry, join(staging, entry.harness));
    if (harness === "all" && !stat(output)) {
      mkdirSync(output);
      createdOutput = true;
    }
    for (const entry of plans) {
      // Recheck after copying so a newly introduced destination is not overwritten.
      if (stat(entry.destination)) throw new Error(`Refusing existing package destination: ${entry.destination}`);
      checkAncestors(dirname(entry.destination));
      renameSync(join(staging, entry.harness), entry.destination);
      published.push(entry.destination);
    }
  } catch (error) {
    for (const destination of published.reverse()) rmSync(destination, { recursive: true });
    if (createdOutput) {
      try { rmdirSync(output); }
      catch (cleanupError) { if (cleanupError.code !== "ENOTEMPTY") throw cleanupError; }
    }
    throw error;
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
  for (const entry of plans) console.log(`${entry.harness} package staged at ${entry.destination}`);
}

try { main(); }
catch (error) { console.error(error.message); process.exitCode = 1; }
