import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";

const harness = process.env.HARNESS;
const source = "/package";
const home = homedir();
const work = "/tmp/scopewright-work";
const expected = {
  "scopewright-create": "SCOPED_FRAMEWORK_V4.md",
  "root-prompt-reviewer": "ROOT_PROMPT_DESIGN_RUBRIC.md",
};
const report = { harness, version: process.env.HARNESS_VERSION, installation: "passed", discovery: "passed", limits: [] };
mkdirSync(work, { recursive: true });
process.chdir(work);

function run(command, args, options = {}) {
  console.log(`$ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    encoding: "utf8", timeout: 60_000, maxBuffer: 16 * 1024 * 1024, ...options,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${command} failed (${result.status}):\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

function version(command) {
  const actual = run(command, ["--version"]).trim();
  assert.ok(actual.includes(report.version), `Expected ${report.version}, got ${actual}`);
  console.log(actual);
}

function stage() {
  const staged = `/tmp/${harness}-staged`;
  run("node", [join(source, "scripts", "package.mjs"), harness, staged]);
  return staged;
}

function archive(staged) {
  const unpacked = `/tmp/${harness}-unpacked`;
  const asset = `/tmp/scopewright-${harness}.tar.gz`;
  run("tar", ["-czf", asset, "-C", staged, "."]);
  mkdirSync(unpacked);
  run("tar", ["-xzf", asset, "-C", unpacked]);
  return unpacked;
}

function installProjectBundle(adapter) {
  const unpacked = archive(stage());
  const manifest = JSON.parse(readFileSync(join(unpacked, "package.json"), "utf8"));
  assert.equal(manifest.scopewright.harness, harness);
  run("node", [join(unpacked, "install.mjs"), work]);
  installedResources(join(work, ".agents"));
  assert.deepEqual(readFileSync(join(work, adapter)), readFileSync(join(source, adapter)),
    "Project installer changed the generated native adapter");
  assert.equal(existsSync(join(home, ".agents", "skills", "scopewright-create")), false,
    "Project installer unexpectedly installed global skills");
  return unpacked;
}

function resources(skills, location = "path") {
  for (const [name, resource] of Object.entries(expected)) {
    const matches = skills.filter(skill => skill.name === name);
    assert.equal(matches.length, 1, `Expected exactly one loaded ${name}`);
    const skill = matches[0];
    assert.notEqual(skill.enabled, false, `${name}: skill is disabled`);
    const bundled = readFileSync(join(dirname(skill[location]), "references", resource));
    const original = readFileSync(join(source, "skills", name, "references", resource));
    assert.deepEqual(bundled, original, `${name}: installed reference differs from canonical resource`);
    console.log(`Loaded ${name}; read preserved resource ${resource} through ${skill[location]}`);
  }
}

function installedResources(root) {
  resources(Object.keys(expected).map(name => ({
    name, description: "CLI-discovered plugin skill", path: join(root, "skills", name, "SKILL.md"),
  })));
}

async function codexSkills() {
  const child = spawn("codex", ["app-server", "--stdio"], { stdio: ["pipe", "pipe", "pipe"] });
  const pending = new Map();
  let nextId = 0;
  let errors = "";
  child.stderr.on("data", chunk => { errors += chunk; });
  const lines = createInterface({ input: child.stdout });
  lines.on("line", line => {
    try {
      const message = JSON.parse(line);
      if (message.id !== undefined && pending.has(message.id)) {
        const { resolve, reject } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) reject(new Error(JSON.stringify(message.error)));
        else resolve(message.result);
      }
    } catch (error) {
      for (const request of pending.values()) request.reject(error);
    }
  });
  child.on("error", error => { for (const request of pending.values()) request.reject(error); });
  child.on("exit", code => {
    for (const request of pending.values()) request.reject(new Error(`Codex exited ${code}: ${errors}`));
  });
  function request(method, params) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      child.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
    });
  }
  const deadline = setTimeout(() => {
    for (const request of pending.values()) request.reject(new Error(`Codex RPC timed out: ${errors}`));
    child.kill("SIGKILL");
  }, 30_000);
  try {
    await request("initialize", {
      clientInfo: { name: "scopewright-install-smoke", version: "1.0.0" },
      capabilities: { experimentalApi: true },
    });
    child.stdin.write(`${JSON.stringify({ method: "initialized" })}\n`);
    const response = await request("skills/list", { cwds: [work], forceReload: true });
    const entry = response.data.find(item => item.cwd === work);
    assert.ok(entry, "Codex did not return the requested workspace");
    assert.deepEqual(entry.errors, [], "Codex rejected installed skills");
    resources(entry.skills);
    for (const skill of entry.skills.filter(item => item.name in expected)) {
      assert.equal(realpathSync(skill.path), join(work, ".agents", "skills", skill.name, "SKILL.md"),
        "Codex bypassed the project-installed skill");
    }
  } finally {
    clearTimeout(deadline);
    lines.close();
    child.stdin.end();
    child.kill();
  }
}

function antigravityDiscovery() {
  const plugins = JSON.parse(run("agy", ["plugin", "list", "--json"]));
  const matches = plugins.filter(plugin => plugin.name === "scopewright");
  assert.equal(matches.length, 1, "Antigravity did not install exactly one scopewright plugin");
  const plugin = matches[0];
  assert.equal(plugin.enabled, true, "Antigravity did not enable scopewright");
  assert.deepEqual(plugin.skills.toSorted(), Object.keys(expected).toSorted(), "Antigravity skill inventory differs");
  assert.deepEqual(plugin.agents, ["root-prompt-reviewer"], "Antigravity native agent inventory differs");
  assert.ok(plugin.path.startsWith(`${home}/`), "Antigravity did not stage the plugin in the isolated home");
  installedResources(plugin.path);
  console.log(`Loaded native root-prompt-reviewer through ${plugin.path}`);
}

async function geminiDiscovery(root) {
  const listing = run("gemini", ["skills", "list", "--all"]);
  for (const name of Object.keys(expected)) assert.ok(listing.includes(`${name} [Enabled]`), listing);
  const { loadSkillsFromDir, loadAgentsFromDirectory } = await import("@google/gemini-cli-core");
  resources(await loadSkillsFromDir(join(root, "skills")), "location");
  const loaded = await loadAgentsFromDirectory(join(root, "agents"));
  assert.deepEqual(loaded.errors, [], "Gemini rejected the installed agent");
  const agent = loaded.agents.find(item => item.name === "root-prompt-reviewer");
  assert.ok(agent, "Gemini did not load root-prompt-reviewer");
  assert.deepEqual(agent.toolConfig.tools.toSorted(), ["glob", "grep_search", "list_directory", "read_file"]);
}

switch (harness) {
  case "claude": {
    version("claude");
    const staged = stage();
    assert.equal(JSON.parse(run("claude", ["plugin", "validate", staged, "--json"])).success, true);
    run("claude", ["plugin", "marketplace", "add", staged, "--json"]);
    run("claude", ["plugin", "install", "scopewright@scopewright", "--json"]);
    const plugins = JSON.parse(run("claude", ["plugin", "list", "--json"]));
    const plugin = plugins.find(item => item.id === "scopewright@scopewright");
    assert.ok(plugin?.enabled, "Claude did not enable scopewright");
    const inventory = run("claude", ["plugin", "details", "scopewright@scopewright"]);
    assert.match(inventory, /Skills \(2\)/, inventory);
    assert.match(inventory, /Agents \(1\)/, inventory);
    for (const name of Object.keys(expected)) assert.ok(inventory.includes(name), inventory);
    installedResources(plugin.installPath);
    break;
  }
  case "codex": {
    version("codex");
    process.env.CODEX_HOME = join(home, ".codex");
    installProjectBundle(".codex/agents/root-prompt-reviewer.toml");
    await codexSkills();
    report.limits.push("Custom agent TOML is applied lazily at subagent spawn; the installed CLI has no offline custom-agent validation/list API. Native agent execution is not verified.");
    break;
  }
  case "pi": {
    version("pi");
    const staged = stage();
    const manifest = JSON.parse(readFileSync(join(staged, "package.json"), "utf8"));
    assert.deepEqual(manifest.pi, { skills: ["./skills"] });
    assert.equal(existsSync(join(staged, "agents")), false, "Pi package must not ship foreign native agents");
    run("pi", ["install", staged]);
    const listing = run("pi", ["list"]);
    assert.ok(listing.includes(staged), listing);
    const { DefaultResourceLoader } = await import("@earendil-works/pi-coding-agent");
    const loader = new DefaultResourceLoader({ cwd: work, agentDir: join(home, ".pi", "agent") });
    await loader.reload();
    const loaded = loader.getSkills();
    assert.deepEqual(loaded.diagnostics, [], "Pi rejected the package resources");
    resources(loaded.skills, "filePath");
    for (const skill of loaded.skills.filter(item => item.name in expected)) {
      assert.equal(skill.sourceInfo.origin, "package", "Pi bypassed package manifest discovery");
    }
    report.limits.push("Pi has no native subagent API; the reviewer is an Agent Skill.");
    break;
  }
  case "omp": {
    version("omp");
    const agentDir = join(home, ".omp", "agent");
    process.env.PI_CODING_AGENT_DIR = agentDir;
    const staged = stage();
    run("omp", ["install", staged]);
    console.log(run("omp", ["plugin", "list", "--json"]));
    const { loadCapability } = await import("@oh-my-pi/pi-coding-agent/discovery/index");
    const { discoverAgents } = await import("@oh-my-pi/pi-coding-agent/task/discovery");
    const loaded = await loadCapability("skills", { cwd: work, providers: ["omp-plugins"] });
    assert.deepEqual(loaded.warnings, [], "OMP rejected installed skills");
    resources(loaded.items);
    const { agents } = await discoverAgents(work);
    const reviewer = agents.find(item => item.name === "root-prompt-reviewer");
    assert.ok(reviewer, "OMP did not discover its native reviewer");
    assert.equal(reviewer.source, "user");
    assert.deepEqual(reviewer.tools.toSorted(), ["glob", "grep", "read"]);
    assert.ok(realpathSync(reviewer.filePath).startsWith(`${staged}/agents/`), "OMP bypassed the staged native adapter");
    for (const field of ["model", "thinkingLevel"]) {
      assert.equal(reviewer[field], undefined, `OMP reviewer unexpectedly configures ${field}`);
    }
    console.log(`Loaded native reviewer through ${reviewer.filePath}; built-in tools: ${reviewer.tools.join(", ")}`);
    report.limits.push("Local omp install links the staged directory; keep it on disk. Discovery and parsed built-in tools are verified, not model execution or additive extension/MCP tool enforcement.");
    break;
  }
  case "antigravity": {
    version("agy");
    const staged = stage();
    run("agy", ["plugin", "install", staged]);
    antigravityDiscovery();
    run("agy", ["plugin", "uninstall", "scopewright"]);
    const unpacked = archive(staged);
    run("agy", ["plugin", "install", unpacked]);
    antigravityDiscovery();
    report.limits.push("Native agent inventory is verified by the real CLI; parsed effective tool policy and model-backed agent execution are not verified.");
    break;
  }
  case "gemini": {
    version("gemini");
    const staged = stage();
    run("gemini", ["extensions", "validate", staged]);
    run("gemini", ["extensions", "install", staged, "--consent"]);
    const installed = join(home, ".gemini", "extensions", "scopewright");
    await geminiDiscovery(installed);
    run("gemini", ["extensions", "uninstall", "scopewright"]);
    const unpacked = archive(staged);
    run("gemini", ["extensions", "validate", unpacked]);
    run("gemini", ["extensions", "install", unpacked, "--consent"]);
    await geminiDiscovery(installed);
    report.limits.push("Agent definitions are parsed by the matching official core SDK; no model-backed agent execution is performed.");
    break;
  }
  case "opencode": {
    version("opencode");
    installProjectBundle(".opencode/agents/root-prompt-reviewer.md");
    const skills = JSON.parse(run("opencode", ["debug", "skill"]));
    resources(skills, "location");
    for (const skill of skills.filter(item => item.name in expected)) {
      assert.equal(realpathSync(skill.location), join(work, ".agents", "skills", skill.name, "SKILL.md"),
        "OpenCode bypassed the project-installed skill");
    }
    const listing = run("opencode", ["agent", "list"]);
    assert.ok(listing.includes("root-prompt-reviewer (subagent)"), listing);
    const agent = JSON.parse(run("opencode", ["debug", "agent", "root-prompt-reviewer"]));
    assert.equal(agent.mode, "subagent");
    const permissions = agent.permission;
    assert.ok(permissions.some(item => item.permission === "*" && item.action === "deny"), "OpenCode lost deny-by-default permissions");
    for (const tool of ["read", "glob", "grep", "list"]) {
      assert.ok(permissions.some(item => item.permission === tool && item.action === "allow"), `OpenCode lost ${tool} permission`);
    }
    for (const tool of ["bash", "edit", "write", "task", "webfetch"]) {
      assert.equal(agent.tools[tool], false, `OpenCode unexpectedly enabled ${tool}`);
    }
    break;
  }
  case "cursor": {
    version("cursor-agent");
    const unpacked = installProjectBundle(".cursor/agents/root-prompt-reviewer.md");
    const plugin = JSON.parse(readFileSync(join(unpacked, ".cursor-plugin", "plugin.json"), "utf8"));
    assert.equal(existsSync(join(unpacked, ".claude-plugin")), false, "Cursor bundle includes Claude metadata");
    assert.ok(readFileSync(join(unpacked, plugin.logo)).length > 0, "Cursor plugin logo is missing");
    const help = run("cursor-agent", ["--help"]);
    assert.ok(help.includes("--plugin-dir"), "Pinned Cursor CLI no longer exposes local plugin loading");
    const commands = run("cursor-agent", ["plugin", "--help"]);
    assert.ok(commands.includes("marketplace"), "Cursor plugin CLI is unavailable");
    report.discovery = "skipped";
    report.limits.push("The unpacked bundle's project installer and preserved skill/agent resources are verified. Cursor CLI installation/version/help are exercised, but plugin/skill/native-agent discovery is SKIPPED: it requires an authenticated Cursor account or interactive app, and this release exposes no credential-free inventory/validation command or official loader SDK. Marketplace approval, authentication, and plugin installation are not claimed.");
    console.log(`::notice title=Cursor discovery skipped::${report.limits[0]}`);
    break;
  }
  default:
    throw new Error(`Unknown harness: ${harness}`);
}

report.limits.push("No credentials are supplied and no model is invoked. Docker runtime networking is disabled.");
console.log(JSON.stringify(report, null, 2));
