import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
assert(args.length === 0 || (args.length === 1 && args[0] === '--check'),
  'Usage: node scripts/sync-agents.mjs [--check]');
const check = args[0] === '--check';
const source = 'skills/root-prompt-reviewer/SKILL.md';
const rubricPath = 'skills/root-prompt-reviewer/references/ROOT_PROMPT_DESIGN_RUBRIC.md';
const skill = await readFile(resolve(root, source), 'utf8');
const parsed = /^---\nname: ([^\n]+)\ndescription: ([^\n]+)\n[\s\S]*?\n---\n([\s\S]+)$/.exec(skill);
assert(parsed, `${source}: expected name, description, and Markdown body`);
const [, name, description, instructions] = parsed;
assert.equal(name, 'root-prompt-reviewer');
const headings = [...instructions.matchAll(/^## ([SCOPED]) — /gm)].map(match => match[1]);
assert.deepEqual(headings, [...'SCOPED'], `${source}: expected six ordered SCOPED sections`);
const rubric = await readFile(resolve(root, rubricPath), 'utf8');
assert(rubric.startsWith('# Root Prompt Design Rubric'), `${rubricPath}: missing rubric`);
const body = `${instructions.trim()}\n\n<!-- Embedded Root Prompt Design Rubric: ${rubricPath} -->\n\n${rubric.trim()}\n`;
assert(!body.includes("'''"), 'Reviewer body contains a TOML multiline-literal delimiter');
const generated = `<!-- Generated from ${source} and its rubric. Run node scripts/sync-agents.mjs; do not edit. -->\n\n`;
const identity = `name: ${name}\ndescription: ${JSON.stringify(description)}\n`;
const markdown = fields => `---\n${fields}---\n\n${generated}${body}`;
const gemini = markdown(`${identity}kind: local\ntools: [read_file, grep_search, glob, list_directory]\n`);
const claude = markdown(`${identity}tools: Read, Grep, Glob\ndisallowedTools: Write, Edit, NotebookEdit, Bash, Agent\n`);
const outputs = {
  '.claude/agents/root-prompt-reviewer.md': claude,
  'agents/root-prompt-reviewer.md': claude,
  '.gemini/agents/root-prompt-reviewer.md': gemini,
  '.agents/agents/root-prompt-reviewer.md': markdown(`${identity}tools: [view_file, grep_search]\nmainAgent: false\nsubagent: true\nmodel: inherit\ncommandExecutionPolicy: "off"\n`),
  '.omp/agents/root-prompt-reviewer.md': markdown(`${identity}tools: read, grep, glob\n`),
  '.opencode/agents/root-prompt-reviewer.md': markdown(`description: ${JSON.stringify(description)}\nmode: subagent\npermission:\n  "*": deny\n  read: allow\n  glob: allow\n  grep: allow\n  list: allow\n`),
  '.cursor/agents/root-prompt-reviewer.md': markdown(`${identity}model: inherit\nreadonly: true\n`),
  '.codex/agents/root-prompt-reviewer.toml': `# Generated from ${source} and its rubric. Run node scripts/sync-agents.mjs; do not edit.\nname = ${JSON.stringify(name)}\ndescription = ${JSON.stringify(description)}\n# Permissions and MCP servers inherit from the parent; use a read-only parent sandbox.\ndeveloper_instructions = '''\n${body}'''\n\n[features]\nshell_tool = false\napps = false\nplugins = false\nmemories = false\nrequest_permissions_tool = false\n`,
};

const stale = [];
for (const [path, content] of Object.entries(outputs)) {
  const destination = resolve(root, path);
  if (check) {
    const existing = await readFile(destination, 'utf8').catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (existing !== content) stale.push(path);
  } else {
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content);
    console.log(`Generated ${path}`);
  }
}
if (stale.length) {
  console.error(`Native adapters differ from canonical criteria:\n${stale.join('\n')}\nRun node scripts/sync-agents.mjs`);
  process.exitCode = 1;
} else if (check) {
  console.log('All native adapters match the canonical reviewer and embedded rubric.');
}
