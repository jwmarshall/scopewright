#!/usr/bin/env node
import { constants, copyFileSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmdirSync, unlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// This file is copied into each project bundle and uses only that bundle's files.
const bundle = fileURLToPath(new URL("./", import.meta.url));

function stat(path) {
  try { return lstatSync(path); }
  catch (error) { if (error.code === "ENOENT") return undefined; throw error; }
}

function checkAncestors(path, project) {
  for (let current = path; ; current = dirname(current)) {
    const info = stat(current);
    if (info && (!info.isDirectory() || info.isSymbolicLink())) {
      throw new Error(`Destination ancestor must be a real directory: ${current}`);
    }
    if (current === project) break;
  }
}

function checkSource(path) {
  const info = lstatSync(path);
  if (info.isDirectory()) {
    for (const entry of readdirSync(path)) checkSource(join(path, entry));
  } else if (!info.isFile()) {
    throw new Error(`Bundle resource must be a regular file or directory: ${path}`);
  }
}

function main() {
  const [directory, ...extra] = process.argv.slice(2);
  if (!directory || directory.startsWith("-") || extra.length) {
    throw new Error("Usage: node <bundle>/install.mjs <existing-project-directory>");
  }
  const project = realpathSync(resolve(directory));
  if (!lstatSync(project).isDirectory()) {
    throw new Error(`Project must be an existing directory: ${project}`);
  }
  const pkg = JSON.parse(readFileSync(join(bundle, "package.json"), "utf8"));
  const harness = pkg.scopewright?.harness;
  if (!["codex", "opencode", "cursor"].includes(harness)) {
    throw new Error("Bundle package.json must identify a supported scopewright.harness");
  }
  const resources = [];
  for (const [source, destination] of [["skills", ".agents/skills"], [`.${harness}/agents`, `.${harness}/agents`]]) {
    const sourceDirectory = join(bundle, source);
    const sourceInfo = lstatSync(sourceDirectory);
    if (!sourceInfo.isDirectory() || sourceInfo.isSymbolicLink()) {
      throw new Error(`Bundle resource must be a real directory: ${sourceDirectory}`);
    }
    const entries = readdirSync(sourceDirectory);
    if (!entries.length) throw new Error(`Bundle resource directory is empty: ${sourceDirectory}`);
    for (const entry of entries) {
      const from = join(sourceDirectory, entry);
      const to = join(project, destination, entry);
      checkSource(from);
      if (stat(to)) throw new Error(`Refusing existing install destination: ${to}`);
      checkAncestors(dirname(to), project);
      resources.push([from, to]);
    }
  }
  // All resources and all destinations are preflighted before the first write.
  const created = [];
  function ensureDirectory(path) {
    const info = stat(path);
    if (info) {
      if (!info.isDirectory() || info.isSymbolicLink()) throw new Error(`Destination must be a real directory: ${path}`);
      return;
    }
    ensureDirectory(dirname(path));
    mkdirSync(path);
    created.push([path, true]);
  }
  function copy(source, destination) {
    ensureDirectory(dirname(destination));
    if (lstatSync(source).isDirectory()) {
      mkdirSync(destination);
      created.push([destination, true]);
      for (const entry of readdirSync(source)) copy(join(source, entry), join(destination, entry));
    } else {
      copyFileSync(source, destination, constants.COPYFILE_EXCL);
      created.push([destination, false]);
    }
  }
  try {
    for (const [source, destination] of resources) {
      checkAncestors(dirname(destination), project);
      copy(source, destination);
    }
  } catch (error) {
    // Remove only paths created by this invocation; never remove unrelated files.
    for (const [path, directory] of created.reverse()) {
      try { if (directory) rmdirSync(path); else unlinkSync(path); }
      catch (cleanupError) {
        if (!["ENOENT", "ENOTEMPTY"].includes(cleanupError.code)) console.error(`Could not remove ${path}: ${cleanupError.message}`);
      }
    }
    throw error;
  }
  console.log(`Installed Scopewright skills and ${harness} agents into ${project}`);
}

try { main(); }
catch (error) { console.error(error.message); process.exitCode = 1; }
