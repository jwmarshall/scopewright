#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const harness = process.argv[2];
const readme = readFileSync("README.md", "utf8");
const support = readFileSync("reference/HARNESS_SUPPORT.md", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

const contracts = {
  claude: {
    docs: [/\/scopewright:create/],
    files: [".claude-plugin/plugin.json", "skills/scopewright-create/SKILL.md", "agents/root-prompt-reviewer.md"],
  },
  pi: {
    docs: [/pi install git:github\.com\/jwmarshall\/scopewright/],
    files: ["package.json", "pi-skills/scopewright-create/SKILL.md", "pi-skills/root-prompt-reviewer/SKILL.md"],
  },
  codex: {
    docs: [/\.agents\/skills\//, /\.codex\/agents\//],
    files: [".agents/skills/scopewright-create/SKILL.md", ".codex/agents/root-prompt-reviewer.toml"],
  },
  gemini: {
    docs: [/gemini extensions install https:\/\/github\.com\/jwmarshall\/scopewright/, /gemini-extension\.json/],
    files: ["gemini-extension.json", ".gemini/agents/root-prompt-reviewer.md", "skills/scopewright-create/SKILL.md"],
  },
  opencode: {
    docs: [/\.agents\/skills\//, /\.opencode\/agents\//],
    files: [".agents/skills/scopewright-create/SKILL.md", ".opencode/agents/root-prompt-reviewer.md"],
  },
  cursor: {
    docs: [/Cursor Marketplace/, /~\/\.cursor\/plugins\/local\/scopewright/, /\.cursor-plugin\/plugin\.json/],
    files: [".cursor-plugin/plugin.json", ".cursor/agents/root-prompt-reviewer.md", ".agents/skills/scopewright-create/SKILL.md"],
  },
};

if (!contracts[harness]) {
  console.error(`Unknown harness '${harness}'. Expected one of: ${Object.keys(contracts).join(", ")}`);
  process.exit(2);
}

const contract = contracts[harness];
const errors = [];
for (const expression of contract.docs) {
  if (!expression.test(readme)) errors.push(`README.md is missing installation guidance matching ${expression}`);
}
const supportName = { claude: "Claude Code", pi: "Pi", codex: "Codex", gemini: "Gemini CLI", opencode: "OpenCode", cursor: "Cursor" }[harness];
if (!support.includes(`| ${supportName} |`)) errors.push(`reference/HARNESS_SUPPORT.md is missing the ${supportName} support row`);
for (const file of contract.files) {
  if (!existsSync(resolve(file))) errors.push(`Required install artifact is missing: ${file}`);
}

if (harness === "pi") {
  if (!packageJson.pi?.skills?.includes("./pi-skills")) errors.push("package.json must expose ./pi-skills as a Pi skill resource");
}
if (harness === "gemini") {
  const manifest = JSON.parse(readFileSync("gemini-extension.json", "utf8"));
  if (manifest.name !== "scopewright") errors.push("Gemini extension manifest name must be scopewright");
}

if (errors.length) {
  console.error(`${harness} install contract failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log(`${harness}: documented installation and required repository artifacts are present.`);
