import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
// These are configuration-contract checks for the generator's known flat
// metadata formats, not a general YAML/TOML parser or a runtime/auth probe.
const adapters = [
  ['agents/root-prompt-reviewer.md', false],
  ['.claude/agents/root-prompt-reviewer.md', false],
  ['.codex/agents/root-prompt-reviewer.toml', false],
  ['.omp/agents/root-prompt-reviewer.md', false],
  ['.agents/agents/root-prompt-reviewer.md', true],
  ['.gemini/agents/root-prompt-reviewer.md', false],
  ['.opencode/agents/root-prompt-reviewer.md', false],
  ['.cursor/agents/root-prompt-reviewer.md', true],
];

function assertInheritedModel(path, content, explicitInherit = false) {
  let metadata;
  if (path.endsWith('.toml')) {
    // Ignore the embedded review instructions, but retain any subsequent
    // top-level assignments before the first table (currently [features]).
    const withoutBody = content.replace(/^developer_instructions = '''[\s\S]*?'''/m, '');
    assert.notEqual(withoutBody, content, `${path}: missing TOML instruction body`);
    metadata = withoutBody.split(/^\[/m)[0];
  } else {
    const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
    assert.ok(match, `${path}: missing frontmatter`);
    metadata = match[1];
  }
  const settings = metadata.split(/\r?\n/).map(line => line.trim()).filter(line =>
    /^["']?(?:model(?:[_-][\w-]+)?|provider|thinking(?:_level)?|reasoning_effort)["']?\s*[:=]/i.test(line));
  assert.deepEqual(settings, explicitInherit ? ['model: inherit'] : [],
    `${path}: inherit the parent provider/model; do not introduce pins or thinking defaults`);
}

for (const [path, explicitInherit] of adapters) {
  test(`${path} inherits its parent model`, async () => {
    assertInheritedModel(path, await readFile(join(root, path), 'utf8'), explicitInherit);
  });
}

for (const name of ['scopewright-create', 'root-prompt-reviewer']) {
  test(`${name} portable skill contains no model configuration`, async () => {
    const path = `skills/${name}/SKILL.md`;
    assertInheritedModel(path, await readFile(join(root, path), 'utf8'));
  });
}

test('creator requires provider-neutral defaults and explicit opt-in for pins/profiles', async () => {
  const creator = await readFile(join(root, 'skills/scopewright-create/SKILL.md'), 'utf8');
  assert.match(creator, /Default to the parent session's exact provider and model/);
  assert.match(creator, /Only add a model pin when the user explicitly requests it/);
  assert.match(creator, /If a requested model is unavailable, report it instead of silently substituting/);
  assert.match(creator, /Use a profile only when the installed harness supports it and the user has configured its mapping; otherwise inherit/);
});

test('model contract rejects pins, provider changes, and thinking defaults', () => {
  const forbidden = [
    'model: anthropic/claude-haiku-4-5',
    'model: openai-codex/example-model',
    'model: google/example-model',
    'model: fast',
    'model: inherit\nmodel: anthropic/example-model',
    'provider: openai',
    'model_provider: openai-codex',
    'thinking: high',
    'reasoning_effort: high',
    'model:\n  provider: anthropic',
  ];
  for (const setting of forbidden) {
    const content = `---\nname: reviewer\n${setting}\n---\n\nReview instructions.\n`;
    assert.throws(() => assertInheritedModel('reviewer.md', content), assert.AssertionError, setting);
    assert.throws(() => assertInheritedModel('reviewer.md', content, true), assert.AssertionError, setting);
  }
  assert.throws(() => assertInheritedModel('reviewer.md', '---\nname: reviewer\n---\n', true), assert.AssertionError);
  for (const setting of ['model = "example-model"', 'model_provider = "openai-codex"', 'model_reasoning_effort = "high"']) {
    for (const position of ['before', 'after']) {
      const body = "developer_instructions = '''\nReview instructions.\n'''\n";
      const content = position === 'before' ? `${setting}\n${body}` : `${body}${setting}\n`;
      assert.throws(() => assertInheritedModel('reviewer.toml', `${content}[features]\nshell_tool = false\n`), assert.AssertionError);
    }
  }
});

test('model references inside review instructions are not treated as configuration', () => {
  assertInheritedModel('reviewer.md', '---\nname: reviewer\n---\n\nmodel: an example in review data\n');
  assertInheritedModel('reviewer.toml', "name = \"reviewer\"\ndeveloper_instructions = '''\nmodel = \"review data\"\n'''\n[features]\nshell_tool = false\n");
});

test('fresh generation preserves inheritance and matches all checked-in adapters', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'scopewright-models-'));
  try {
    for (const path of [
      'scripts/sync-agents.mjs',
      'skills/root-prompt-reviewer/SKILL.md',
      'skills/root-prompt-reviewer/references/ROOT_PROMPT_DESIGN_RUBRIC.md',
    ]) {
      const destination = join(fixture, path);
      await mkdir(dirname(destination), { recursive: true });
      await copyFile(join(root, path), destination);
    }
    const script = join(fixture, 'scripts/sync-agents.mjs');
    execFileSync(process.execPath, [script], { cwd: fixture, encoding: 'utf8' });
    for (const [path, explicitInherit] of adapters) {
      const generated = await readFile(join(fixture, path), 'utf8');
      assertInheritedModel(path, generated, explicitInherit);
      assert.equal(generated, await readFile(join(root, path), 'utf8'), `${path}: generated adapter drift`);
    }
    execFileSync(process.execPath, [script, '--check'], { cwd: fixture, encoding: 'utf8' });
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
