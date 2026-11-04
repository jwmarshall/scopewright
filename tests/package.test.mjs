import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, readlink, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const cli = join(root, "scripts/package.mjs");
const projectHarnesses = ["codex", "opencode", "cursor"];
const adapter = harness => `.${harness}/agents/root-prompt-reviewer.${harness === "codex" ? "toml" : "md"}`;

async function temporary(t) {
  const path = await mkdtemp(join(tmpdir(), "scopewright-package-test-"));
  t.after(() => rm(path, { recursive: true, force: true }));
  return path;
}

function node(script, args, cwd = root) {
  return spawnSync(process.execPath, [script, ...args], { cwd, encoding: "utf8" });
}

function succeeds(result) {
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
}

function refuses(result, message) {
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0, result.stdout);
  assert.match(result.stderr, message);
}

async function put(path, content = "customized\n") {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

async function snapshot(path) {
  const info = await lstat(path).catch(error => {
    if (error.code === "ENOENT") return undefined;
    throw error;
  });
  if (!info) return null;
  if (info.isSymbolicLink()) return { symlink: await readlink(path) };
  if (info.isFile()) return { file: (await readFile(path)).toString("base64") };
  return Object.fromEntries(await Promise.all((await readdir(path)).sort().map(async entry => [entry, await snapshot(join(path, entry))])));
}

test("packaging refuses a customized output without changing it", async t => {
  const temp = await temporary(t);
  const output = join(temp, "bundle");
  await put(join(output, "skills/custom/SKILL.md"));
  await put(join(output, ".local-settings"), "keep this too\n");
  const before = await snapshot(temp);
  refuses(node(cli, ["pi", output]), /Refusing existing package destination/);
  assert.deepEqual(await snapshot(temp), before);
});

test("all-package collision preflight does not stage any other harness", async t => {
  const temp = await temporary(t);
  const output = join(temp, "release");
  await put(join(output, "cursor/customized.txt"));
  await put(join(output, "unrelated.txt"));
  const before = await snapshot(temp);
  refuses(node(cli, ["all", output]), /Refusing existing package destination/);
  assert.deepEqual(await snapshot(temp), before);
});

test("packaging refuses output leaf symlinks but accepts explicit parent aliases", async t => {
  const temp = await temporary(t);
  await mkdir(join(temp, "outside"));
  await put(join(temp, "outside/keep.txt"));
  await symlink(join(temp, "missing"), join(temp, "existing-link"));
  await symlink(join(temp, "outside"), join(temp, "linked-parent"));
  const before = await snapshot(temp);
  refuses(node(cli, ["pi", join(temp, "existing-link")]), /Refusing existing package destination/);
  assert.deepEqual(await snapshot(temp), before);
  succeeds(node(cli, ["pi", join(temp, "linked-parent/bundle")]));
  assert.ok((await lstat(join(temp, "outside/bundle/skills"))).isDirectory());
  assert.equal(await readFile(join(temp, "outside/keep.txt"), "utf8"), "customized\n");
});

for (const harness of projectHarnesses) {
  test(`${harness} installer preflights every customized skill and agent destination`, async t => {
    const temp = await temporary(t);
    const bundle = join(temp, "bundle");
    succeeds(node(cli, [harness, bundle]));
    for (const [index, collision] of [".agents/skills/root-prompt-reviewer/SKILL.md", ".agents/skills/scopewright-create/SKILL.md", adapter(harness)].entries()) {
      const project = join(temp, `project-${index}`);
      await put(join(project, collision));
      await put(join(project, ".agents/skills/unrelated/SKILL.md"));
      await put(join(project, `.${harness}/agents/unrelated.md`));
      await put(join(project, "src/keep.txt"));
      const before = await snapshot(project);
      const projectAlias = join(temp, `project-alias-${index}`);
      await symlink(project, projectAlias);
      refuses(node(join(bundle, "install.mjs"), [projectAlias]), /Refusing existing install destination/);
      assert.deepEqual(await snapshot(project), before, collision);
    }
  });

  test(`${harness} installer refuses symlink resources and ancestors without writes`, async t => {
    const temp = await temporary(t);
    const bundle = join(temp, "bundle");
    succeeds(node(cli, [harness, bundle]));
    const outside = join(temp, "outside");
    await put(join(outside, "keep.txt"));
    const links = [".agents", ".agents/skills", ".agents/skills/root-prompt-reviewer", ".agents/skills/scopewright-create", `.${harness}`, `.${harness}/agents`, adapter(harness)];
    for (const [index, link] of links.entries()) {
      const project = join(temp, `project-${index}`);
      await mkdir(dirname(join(project, link)), { recursive: true });
      // Include dangling resource links: existence checks must not follow them.
      const target = link.startsWith(".agents/skills/") || link === adapter(harness) ? join(temp, "missing") : outside;
      await symlink(target, join(project, link));
      const before = await snapshot(project);
      const externalBefore = await snapshot(outside);
      refuses(node(join(bundle, "install.mjs"), [project]), /Refusing existing install destination|must be a real directory/);
      assert.deepEqual(await snapshot(project), before, link);
      assert.deepEqual(await snapshot(outside), externalBefore, link);
    }
  });

}

for (const [harness, manifest] of [["claude", ".claude-plugin/plugin.json"], ["gemini", ".gemini/gemini-extension.json"], ["cursor", ".cursor-plugin/plugin.json"]]) {
  test(`${harness} manifest version mismatch refuses to create an output or its parents`, async t => {
    const temp = await temporary(t);
    const source = join(temp, "source");
    await mkdir(join(source, "scripts"), { recursive: true });
    await cp(cli, join(source, "scripts/package.mjs"));
    await cp(join(root, "package.json"), join(source, "package.json"));
    const metadata = JSON.parse(await readFile(join(root, manifest), "utf8"));
    metadata.version = "999.0.0";
    await put(join(source, manifest), JSON.stringify(metadata));
    const before = await snapshot(temp);
    refuses(node(join(source, "scripts/package.mjs"), [harness, join(temp, "not-created/bundle")]), /manifest and package versions must match/);
    assert.deepEqual(await snapshot(temp), before);
  });
}

test("missing sources in the last all-package plan do not leave earlier packages", async t => {
  const temp = await temporary(t);
  const source = join(temp, "source");
  await mkdir(source);
  for (const path of ["package.json", "LICENSE", "scripts", "skills", "agents", ".claude-plugin", ".omp", ".agents", ".antigravity", ".gemini", ".codex", ".opencode", ".cursor", ".cursor-plugin"]) {
    await cp(join(root, path), join(source, path), { recursive: true });
  }
  await rm(join(source, ".claude-plugin/icon.png"));
  const before = await snapshot(temp);
  refuses(node(join(source, "scripts/package.mjs"), ["all", join(temp, "not-created/release")]), /ENOENT/);
  assert.deepEqual(await snapshot(temp), before);
});
