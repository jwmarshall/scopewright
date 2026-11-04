import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const statePath = ".scopewright/install.json";
const skillPath = ".agents/skills/root-prompt-reviewer/SKILL.md";

async function fixture(t) {
  const temp = await mkdtemp(join(tmpdir(), "scopewright-install-test-"));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const source = join(temp, "source");
  const project = join(temp, "project");
  await mkdir(source);
  await mkdir(project);
  for (const name of ["package.json", "scripts", "skills", "agents", ".omp", ".codex", ".opencode", ".cursor", ".agents", ".gemini"]) {
    await cp(join(root, name), join(source, name), { recursive: true });
  }
  return { temp, source, project };
}

function invoke(source, project, command = "install", harness = "codex") {
  return spawnSync(process.execPath, [join(source, "scripts/install.mjs"), command, "--harness", harness, "--local", "--project", project], { encoding: "utf8" });
}

function succeeds(result) {
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
}

function refuses(result, expression) {
  assert.ifError(result.error);
  assert.notEqual(result.status, 0, result.stdout);
  assert.match(result.stderr, expression);
}

async function files(directory) {
  const result = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      for (const [name, content] of Object.entries(await files(join(directory, entry.name)))) result[`${entry.name}/${name}`] = content;
    } else {
      result[entry.name] = (await readFile(join(directory, entry.name))).toString("base64");
    }
  }
  return result;
}

async function put(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

test("update replaces owned files, adds new resources, prunes obsolete files, and preserves user files", async t => {
  const { source, project } = await fixture(t);
  const oldReference = "skills/root-prompt-reviewer/references/obsolete.md";
  await put(join(source, oldReference), "old version\n");
  succeeds(invoke(source, project));
  await put(join(project, ".agents/skills/root-prompt-reviewer/custom.md"), "user-owned\n");
  const sourceSkill = join(source, "skills/root-prompt-reviewer/SKILL.md");
  const updated = `${await readFile(sourceSkill, "utf8")}\nUpdated reviewer instructions.\n`;
  await writeFile(sourceSkill, updated);
  await rm(join(source, oldReference));
  await put(join(source, "skills/root-prompt-reviewer/references/new.md"), "new version\n");
  const pkg = JSON.parse(await readFile(join(source, "package.json"), "utf8"));
  pkg.version = "999.0.0";
  await writeFile(join(source, "package.json"), JSON.stringify(pkg));
  succeeds(invoke(source, project, "update"));
  assert.equal(await readFile(join(project, skillPath), "utf8"), updated);
  await assert.rejects(readFile(join(project, ".agents", oldReference)), { code: "ENOENT" });
  assert.equal(await readFile(join(project, ".agents/skills/root-prompt-reviewer/references/new.md"), "utf8"), "new version\n");
  assert.equal(await readFile(join(project, ".agents/skills/root-prompt-reviewer/custom.md"), "utf8"), "user-owned\n");
  const state = JSON.parse(await readFile(join(project, statePath), "utf8"));
  assert.equal(state.harnesses.codex, pkg.version);
  assert.equal(state.files[`.agents/${oldReference}`], undefined);
});

test("install and update both refuse edited owned resources before changing any other resource or state", async t => {
  const { source, project } = await fixture(t);
  succeeds(invoke(source, project));
  await writeFile(join(project, ".codex/agents/root-prompt-reviewer.toml"), "my customized reviewer\n");
  await writeFile(join(source, "skills/root-prompt-reviewer/SKILL.md"), "incoming changed instructions\n");
  const before = await files(project);
  for (const command of ["install", "update"]) {
    refuses(invoke(source, project, command), /modified|conflict/i);
    assert.deepEqual(await files(project), before);
  }
});

test("an identical unmanaged destination is not silently adopted", async t => {
  const { source, project } = await fixture(t);
  await put(join(project, skillPath), await readFile(join(source, "skills/root-prompt-reviewer/SKILL.md")));
  const before = await files(project);
  refuses(invoke(source, project), /unmanaged|existing install destination/i);
  assert.deepEqual(await files(project), before);
  assert.deepEqual(await readdir(project), [".agents"]);
});

test("shared skills retain their other harness owner when one adapter drops a resource", async t => {
  const { source, project } = await fixture(t);
  const reference = "skills/root-prompt-reviewer/references/shared.md";
  await put(join(source, reference), "shared baseline\n");
  succeeds(invoke(source, project));
  succeeds(invoke(source, project, "install", "opencode"));
  await rm(join(source, reference));
  succeeds(invoke(source, project, "update", "codex"));
  assert.equal(await readFile(join(project, `.agents/${reference}`), "utf8"), "shared baseline\n");
  succeeds(invoke(source, project, "update", "opencode"));
  await assert.rejects(readFile(join(project, `.agents/${reference}`)), { code: "ENOENT" });
  assert.equal(await readFile(join(project, ".codex/agents/root-prompt-reviewer.toml"), "utf8"), await readFile(join(source, ".codex/agents/root-prompt-reviewer.toml"), "utf8"));
});

test("updating an unregistered harness refuses without creating installation state", async t => {
  const { source, project } = await fixture(t);
  refuses(invoke(source, project, "update"), /not installed|no managed/i);
  assert.deepEqual(await readdir(project), []);
});

test("state traversal and invalid ownership cannot authorize changing an unrelated project file", async t => {
  const { source, project, temp } = await fixture(t);
  succeeds(invoke(source, project));
  const manifest = JSON.parse(await readFile(join(project, statePath), "utf8"));
  await writeFile(join(temp, "outside.txt"), "outside\n");
  for (const path of ["../outside.txt", "src/unrelated.txt"]) {
    const altered = structuredClone(manifest);
    altered.files[path] = { hash: "0".repeat(64), harnesses: ["codex"] };
    await writeFile(join(project, statePath), JSON.stringify(altered));
    const before = await files(project);
    refuses(invoke(source, project, "update"), /invalid|unsafe/i);
    assert.deepEqual(await files(project), before);
    assert.equal(await readFile(join(temp, "outside.txt"), "utf8"), "outside\n");
  }
});

test("state and managed destination symlinks are refused without modifying their targets", async t => {
  const { source, project, temp } = await fixture(t);
  succeeds(invoke(source, project));
  const outside = join(temp, "outside.txt");
  await writeFile(outside, "outside\n");
  for (const relative of [statePath, skillPath]) {
    const path = join(project, relative);
    const original = await readFile(path);
    await rm(path);
    await symlink(outside, path);
    refuses(invoke(source, project, "update"), /regular file|symlink|conflict/i);
    assert.equal(await readFile(outside, "utf8"), "outside\n");
    await rm(path);
    await writeFile(path, original);
  }
});

test("an active install lock is not stolen or deleted", async t => {
  const { source, project } = await fixture(t);
  succeeds(invoke(source, project));
  await mkdir(join(project, ".scopewright/lock"));
  const before = await files(project);
  refuses(invoke(source, project, "update"), /lock|another/i);
  assert.deepEqual(await files(project), before);
  assert.ok((await readdir(join(project, ".scopewright"))).includes("lock"));
});
