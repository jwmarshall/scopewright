# scopewright

[Website](https://jwmarshall.github.io/scopewright/)

> _scope_ (examine under a scope) + _-wright_ (a maker, as in playwright/shipwright):
> a maker of SCOPED reviewers.

**scopewright** scaffolds read-only **reviewers** for eight harnesses: Claude Code,
Codex, Pi, OhMyPi, Antigravity CLI (recommended for Google), legacy Gemini CLI,
OpenCode, and Cursor, plus Agent Skills-compatible harnesses. It is built on
the [SCOPED framework](./skills/scopewright-create/references/SCOPED_FRAMEWORK_V4.md). It doesn't review your
code — it interviews you and _writes a reviewer_ tailored to your project. You supply
the domain (runtime, language, criteria, stakes); scopewright prescribes the form:
dependency-ordered S/C/O/P/E/D structure, strict read-only constraints, prompt-injection
defenses, and clear verdict authority.

## Usage

Install separately in each harness. Prefer the native Claude marketplace or Pi
package below. For project files in any of the eight harnesses, use the managed
project CLI. Skills are instructions, not a security sandbox; native subagents add
the controls described in the [support matrix](./reference/HARNESS_SUPPORT.md).

**Managed CLI requirements:** Scopewright **0.3.0 or newer** and Node.js 22+.
Version 0.2.0 provides skills but has no project installer CLI. Native marketplace
and package-manager installations retain their own lifecycle.
An existing source checkout can run the same dependency-free CLI:

```bash
node /path/to/scopewright/scripts/install.mjs install --harness omp --local --project /path/to/project
node /path/to/scopewright/scripts/install.mjs update --harness omp --local --project /path/to/project
```

No `npm install` or build is required for that source equivalent. Release archives
are an alternative for offline/native-package use; building a checkout is a
[contributor workflow](#multi-agent-design), not the default end-user installation.

### Claude Code

Register this repository as a marketplace, then install its plugin:

```bash
claude plugin marketplace add jwmarshall/scopewright
claude plugin install scopewright@scopewright
```

In Claude Code, run `/scopewright:scopewright-create [what the reviewer should evaluate]`.
Use Claude's plugin manager to update the native installation. The managed CLI
with `--harness claude` is an alternative for project files, installing complete
skills to `.claude/skills/` and the reviewer to `.claude/agents/`.

For offline/session-only plugin use, unpack `scopewright-claude.tar.gz` from a
[tagged release](https://github.com/jwmarshall/scopewright/releases):

```bash
claude --plugin-dir /absolute/path/to/unpacked-claude-package
```

Keep that directory: `--plugin-dir` loads it for the session. For persistent native
installation, register the unpacked directory using
`claude plugin marketplace add /absolute/path/to/unpacked-claude-package`, then use
the same `claude plugin install scopewright@scopewright` command above.

### Pi

Run from your project to register the existing npm skills package with Pi:

```bash
pi install --local npm:scopewright
```

Direct Git is also supported:
`pi install --local git:github.com/jwmarshall/scopewright`.

Pi manages its own package cache; `--local` makes the package declaration
project-scoped. Grant project trust when prompted and restart/reload Pi, then run
`/skill:scopewright-create [what the reviewer should evaluate]`. Use Pi's package
manager for native updates. The package exposes canonical skills through `pi.skills`,
with no native agents or companion extension; reviewers run as skills in the current
session. The managed CLI with `--harness pi` is an alternative that copies only
complete skills into `.pi/skills/`, without a Pi package declaration.

### Managed project installation and updates

Node.js 22+ can install files into an existing project without a checkout, build,
global install, or runtime dependencies:

```bash
npx scopewright@latest install --harness omp --local --project /absolute/path/to/project
npx scopewright@latest update --harness omp --local --project /absolute/path/to/project
```

Replace `omp` with any value in the table. `--project` defaults to the current
directory; `--local` is optional but recommended to make project scope explicit.
There is no `--global` support and no home-directory configuration is written.
`--help` and `--version` are available. Fetching `@latest` alone does **not** refresh
installed files: run the explicit `update` command for every installed harness you
want to refresh.

| `--harness` | Complete skill copies | Native reviewer copy |
| --- | --- | --- |
| `claude` | `.claude/skills/` | `.claude/agents/` |
| `codex` | `.agents/skills/` | `.codex/agents/` |
| `pi` | `.pi/skills/` | none |
| `omp` | `.omp/skills/` | `.omp/agents/` |
| `antigravity` | `.agents/skills/` | `.agents/agents/` |
| `gemini` | `.gemini/skills/` | `.gemini/agents/` |
| `opencode` | `.agents/skills/` | `.opencode/agents/` |
| `cursor` | `.agents/skills/` | `.cursor/agents/` |

Both bundled skills include their full reference trees. The copied adapter is the
existing generated harness adapter, not a transformed prompt. Resources are
self-contained: the source package or npm cache can be removed after installation.

#### Ownership and conflicts

The CLI records file SHA-256 hashes, owning harnesses, and each harness's last
installed version in `.scopewright/install.json`. Keep this state with the managed
files. `install` accepts absent destinations or unchanged, already-managed files;
`update` requires that the selected harness was previously managed.

Both commands refresh the selected harness's resources. An obsolete unchanged file
is removed only when no other harness owns it. Codex, OpenCode, Cursor, and
Antigravity share `.agents/skills/`: refreshing those skills updates the shared
hash/content for every owner, without changing the other harnesses' native adapters.
Unrelated files and user-created reviewers are preserved.

Edited managed files, unmanaged existing destinations, symlinks, and symlinked
internal destination/resource ancestors are conflicts. Preflight rejects these
before resource writes, leaving files unchanged. An explicitly supplied project-root
symlink alias is accepted; internal symlinks are not. There is no force mode and no
automatic adoption of older manual/native installs.

To migrate an old unmanaged file install or resolve customizations, **you** must
back up and move the conflicting installed files outside the destination paths
before running `install` again. For edited managed files, preserve your edits and
restore the recorded managed version before updating, or move the conflicting
files aside and rerun. The CLI never creates backups or merges edits for you.
Do not remove ownership state just to bypass a conflict, and do not overwrite
locally authored reviewers without preserving them.

### OhMyPi

Use the managed project command above with `--harness omp`. Restart OhMyPi, then
use `/skill:scopewright-create`. Ask the parent to dispatch `root-prompt-reviewer`
through `task`, supplying `<target_files>` paths.

For native package use, unpack `scopewright-omp.tar.gz`, then:

```bash
omp install /absolute/path/to/unpacked-omp-package
omp plugin list --json
```

Keep the package directory: native `omp install` links it. Use a fresh unpacked
directory for native package updates, preserving customized agents first; existing
user/project agents take precedence. Do **not** run `omp install` on the repository
root: root `agents/` contains Claude plugin definitions. The root **Scopewright CLI**
with `--harness omp` selects the correct OMP adapter and does not have this problem.

### Antigravity CLI — recommended Google harness

Use managed project files rather than cloning/building a plugin:

```bash
npx scopewright@latest install --harness antigravity --local --project /absolute/path/to/project
npx scopewright@latest update --harness antigravity --local --project /absolute/path/to/project
```

Ask Antigravity to use `scopewright-create` and select `antigravity` for output.
Native project reviewers use `.agents/agents/<name>.md`.

If you need native plugin registration instead, unpack
`scopewright-antigravity.tar.gz` and run:

```bash
agy plugin install /absolute/path/to/unpacked-antigravity-package
agy plugin list --json
```

Install the matching plugin directory, not the repository root or the legacy Gemini
extension. Installation/inventory do not prove model behavior or runtime tool
enforcement; see the [support matrix](./reference/HARNESS_SUPPORT.md).

### Gemini CLI — legacy / enterprise / paid API-key

Antigravity is Google's recommended successor for individual users.
[Google's June 18, 2026 transition](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/)
stopped individual free, Pro, and Ultra Gemini CLI requests. Enterprise licenses
and paid API-key access remain supported.

For project files:

```bash
npx scopewright@latest install --harness gemini --local --project /absolute/path/to/project
npx scopewright@latest update --harness gemini --local --project /absolute/path/to/project
```

Use `/skills list` to inspect the skills, then ask Gemini to use `scopewright-create`.

For native extension registration, unpack `scopewright-gemini.tar.gz` and run:

```bash
gemini extensions install /absolute/path/to/unpacked-gemini-package
```

This remains a separate Gemini extension, not an Antigravity plugin. The repository
root is a Claude plugin, not a Gemini extension.

### Codex

Use the managed project commands with `--harness codex`. Restart Codex, then use
`$scopewright-create` or ask it to use `scopewright-create`. Ask the parent to delegate
to `root-prompt-reviewer` for a review. Enforced filesystem isolation requires the
**parent's read-only sandbox**; the custom agent cannot override it.

### OpenCode

Use the managed project commands with `--harness opencode`. Restart OpenCode, ask it
to use `scopewright-create`, or invoke `@root-prompt-reviewer` with `<target_files>`
paths. The native adapter keeps its deny-by-default tool permissions.

### Cursor

Use the managed project commands with `--harness cursor`. Restart Cursor and ask it
to use `scopewright-create` or delegate to `root-prompt-reviewer`. The Cursor archive
also includes its native plugin manifest and logo; marketplace approval is not
assumed. Authenticated plugin inventory cannot be verified by the offline harness.

### Archive / offline project installers

Unpack the matching Codex, OpenCode, or Cursor release archive. Its bundled installer
infers the harness from package metadata and uses the same managed ownership state:

```bash
node /absolute/path/to/unpacked-package/install.mjs install --local --project /absolute/path/to/project
node /absolute/path/to/new-unpacked-package/install.mjs update --local --project /absolute/path/to/project
```

The old positional-only project argument is no longer supported. Local native
Pi/OMP package installs and Claude `--plugin-dir` loads need their source directories;
managed project copies do not. Generic Agent Skills installers remain an alternative
for **skills only**, not native adapters.

### Reviewer creation

The creator reads the bundled framework, inspects your project, and interviews you
for Specifications, Constraints, Objective, Purpose, Execution standards, and
Decision authority. It writes a portable reviewer plus a selected native adapter,
asking before replacing either.

| Harness | Native reviewer output | Invocation |
| --- | --- | --- |
| Claude Code | `.claude/agents/<name>.md` | ask Claude to delegate to `<name>` |
| Codex | `.codex/agents/<name>.toml` | ask Codex to delegate to `<name>` |
| OhMyPi | `.omp/agents/<name>.md` | ask the parent to use the named task agent |
| Antigravity CLI (recommended Google) | `.agents/agents/<name>.md` | ask Antigravity to delegate to `<name>` |
| Gemini CLI (legacy / enterprise / paid API-key) | `.gemini/agents/<name>.md` | ask Gemini to delegate to `<name>`; enable subagents when required by its version |
| OpenCode | `.opencode/agents/<name>.md` | `@<name> <target_files>…` |
| Cursor | `.cursor/agents/<name>.md` | ask Cursor to delegate to `<name>` |
| Pi | none; portable skill | `/skill:<name> <target_files>…` |

The portable reviewer uses `.agents/skills/<name>/SKILL.md` where supported;
the creator uses the active harness's skill directory when needed.
Every reviewer accepts target file paths or the raw-data mode selected in its interview.

### Provider and model selection

Reviewers inherit the parent session's provider and model by default. They do not
require Anthropic or automatically choose a different vendor for a particular role.
Portable skills contain no model settings; native adapters omit model/provider
settings or use the harness's documented `model: inherit` option.
Only an explicit user request should introduce a model pin. Provider connections
matter: subscription-backed and API-key-backed connections are not interchangeable.

With the optional `@tintinweb/pi-subagents` extension, its built-in `Explore` may
pin an Anthropic model independently of Scopewright. Eject/override that agent via
`/agents`, then **remove** its `model` field to inherit Pi's current session model.
Preserve the original prompt and tool restrictions. Use the exact `name: Explore`;
a lowercase `explore` is a separate agent. A distinct filename such as
`~/.pi/agent/agents/explore-inherit.md` avoids colliding with an existing lowercase
file on case-insensitive filesystems. Do not edit installed package files.
Agent configuration can override a tool call's `model` argument, so changing only
the argument may not remove a pin. Scopewright does not require this extension.

Optional fast/balanced/reasoning routing belongs in the harness and requires
user-configured mappings to available models. Scopewright does not implement these
profiles or emit unsupported profile fields. Without a configured mapping, inherit;
never guess a vendor-equivalent model or silently cross providers.

## What it produces

A SCOPED reviewer follows the framework's six sections in dependency order and:

- treats all acquired data (file contents or raw payloads) as **untrusted input**;
- halts with an explicit `[INSUFFICIENT DATA: …]` string when context is missing;
- returns a distilled **Structured Analytical Report**, without writing logs or
  dumping raw data into the chat;
- issues verdicts (e.g. `[APPROVED]` / `[REJECTED]`) to its Caller and escalates with
  `[FAILED: …]` instead of acting on state or asking humans directly.

## Bundled reviewer: `root-prompt-reviewer`

The package also ships a ready-made SCOPED reviewer you can invoke directly — no
interview required. **`root-prompt-reviewer`** audits a repository's root prompts
(`CLAUDE.md`, `AGENTS.md`) — the instructions that execute on _every_ inference — for:

- **token economy** — conversational filler and bloat that taxes every message;
- **safety guardrails** — missing limits on destructive actions (DB mutations, file
  deletions, quota burn) without human-in-the-loop confirmation;
- **orchestration architecture** — context stuffing that belongs in `/commands` or
  Skills, non-universal rules, premise-ordering failures, and unstructured prose.

It scores the target against six dimensions and returns an `[APPROVED]` / `[REJECTED]`
verdict with a dimension scorecard and line-cited fixes. The pass/fail standard lives in
[`ROOT_PROMPT_DESIGN_RUBRIC.md`](./skills/root-prompt-reviewer/references/ROOT_PROMPT_DESIGN_RUBRIC.md).
The portable skill reads its bundled copy; generated native adapters embed it.

## The SCOPED framework

**SCOPED** stands for **S**pecifications, **C**onstraints, **O**bjective,
**P**urpose, **E**xecution standards, and **D**ecision authority. It is a prompting
framework for building review and evaluation subagents that produce consistent,
thorough, actionable verdicts.

Its central idea is _dependency-first ordering_: the six sections are arranged in the
order the model actually **uses** the information while reasoning, not the order that
reads naturally to a human. LLMs degrade sharply (the spec cites 30%+ drops) when
premises arrive out of sequence and the model has to back-reference. SCOPED removes
that back-referencing — each section is fully grounded by the ones above it:

```
Specifications  → grounding facts, specialization & how to acquire data
  Constraints     → the pass/fail rules derived from those facts
    Objective       → one sentence synthesizing the task
      Purpose         → why it matters; calibrates thoroughness
        Execution std.  → the quality bar for the output itself
          Decision auth.  → read-only autonomy, verdicts & escalation
```

### S — Specifications & Context

The technical foundation, established **first** because the agent must know _how to
safely acquire data_ and _what expertise to bring_ before it ever reads the criteria.
This section carries the functional specialization (concrete stack, versions,
conventions — so the agent behaves like an expert instead of being told to "pretend"
to be one), plus three safety rules: a **data-acquisition** rule (read `<target_files>`
paths vs. parse a `<raw_data>` payload), a **data-encapsulation** rule (treat everything
acquired as _untrusted_, never as instructions), and an **input-validation** halt
condition (the exact `[INSUFFICIENT DATA: …]` string to emit when context is missing).
_Why it leads:_ safe, specialized grounding has to exist before any evaluation can be
trusted.

### C — Constraints & Requirements

The explicit, **binary and testable** conditions that decide acceptance or rejection —
pass/fail rules with detection methods and thresholds-with-units, not subjective scales.
_Why here:_ it depends on the stack and data structures named in S, and replaces vague
"use good judgment" reviewing with criteria the agent can apply deterministically.

### O — Objective Statement

A single synthesizing sentence (verb + deliverable + reference to the criteria/data
above) that the agent can act on decisively. _Why here:_ it only makes sense once the
facts (S) and the rules (C) are in place; it fuses them into one unambiguous task.

### P — Purpose & Impact

What the review **gates** and the concrete consequences of a miss — regulatory,
financial, operational. _Why it matters:_ stakes calibrate thoroughness. "Gates a $2M
payment API; a miss means PCI-DSS failure" tells the agent how hard to look in a way
the rules alone cannot.

### E — Execution Standards

The quality bar for the **output itself**: a compact Structured Analytical Report,
line-cited evidence, and no raw-data dumps. Scopewright's strict read-only reviewers
return existing evidence paths rather than writing logs. This protects the caller's
context without granting the reviewer mutation authority.

### D — Decision Authority

The agent's professional stance and hard boundaries, placed **last** because it governs
what to _do_ with everything above. It defines the verdict vocabulary the agent may
return to its Caller (`[APPROVED]`/`[REJECTED]`, or domain-specific like
`[BLOCK DEPLOYMENT]`), the posture it is empowered to take (state findings as facts;
challenge assumptions rather than be politely agreeable), and escalation that halts with
`[FAILED: …]` to the Caller instead of acting on state or asking humans directly. _Why
it matters:_ this is where read-only safety is enforced in prose — countering the
"action-taker" hallucination (claiming to have mutated state) and the "helpful
assistant" drift ("looks mostly good…") that undermine real review.

Together these defend against the framework's named anti-patterns — action-taking,
reflexive politeness, prompt injection through unprotected context, and token-wasting
theatrical role-play.

## Multi-agent design

`skills/` is the only authored skill tree. Each skill bundles its own references,
so installing a single skill never loses its framework or rubric.
The root npm package exposes the dependency-free project CLI and all eight resource
sets. Harness-specific archives expose only the matching adapter and manifest;
Codex, OpenCode, and Cursor also bundle the managed project installer.
Native plugin/package managers remain separate from project-copy ownership.

For contributors building archives from a checkout, Node.js 22+ is sufficient;
no `npm install` is required:

```bash
npm run package:omp
# Or all eight:
npm run package:all
```

Builders refuse existing destinations. Use
`npm run package:omp -- /absolute/path/to/fresh-package` for a fresh output path.
These commands build distribution artifacts; they do not update installed projects.

The canonical reviewer lives in `skills/root-prompt-reviewer/SKILL.md`.
`npm run sync:agents` generates the harness adapters; `npm run check` rejects drift
and runs the provider-neutral model-selection regression tests (`npm test`).
Edit the canonical skill or generator, not generated agent files.
Root `agents/` follows Claude's plugin convention. `.claude/agents/` also supports
project installation. Antigravity's manifest source is `.antigravity/plugin.json`;
its generated reviewer lives in `.agents/agents/`. The plugin build copies these
to `dist/antigravity/plugin.json` and `dist/antigravity/agents/`, alongside `skills/`
and `LICENSE`.

Legacy Gemini's manifest and adapters live in `.gemini/`; its build copies only
Gemini definitions into the staged extension's root `agents/`.

### Prior art

- [Superpowers](https://github.com/obra/superpowers) (303k stars when checked):
  one `skills/` tree, native manifests, separate per-harness installation.
- [Vercel skills](https://github.com/vercel-labs/skills) (36k stars when checked):
  discover conventional skill folders and install whole skill directories to each
  harness's supported path, rather than maintaining duplicate source trees.
- [Agent Skills specification](https://agentskills.io/specification):
  portable `SKILL.md` frontmatter and skill-local `references/`.

The root project installer supports all eight harnesses without inventing a shared
native plugin format or changing global harness settings.
See the [support matrix](./reference/HARNESS_SUPPORT.md) for vendor sources.

### Migration

The old `skills/create`, `pi-skills/`, and checked-in `.agents/skills/` copies are
removed. Reinstall through the commands above; replace `/scopewright:create` with
`/scopewright:scopewright-create`. Remove old installed copies only after preserving
any local customizations. Generated reviewers in your own projects are not migrated
or overwritten automatically.

The framework and rubric moved into their owning skill's `references/` directory.
Update external links to those paths. No compatibility aliases remain.
Direct Gemini extension installation from the repository root is replaced by the
managed project CLI, or the unpacked Gemini-only archive for native extension use.
The ambiguous `scopewright.tar.gz` release name is replaced by
`scopewright-gemini.tar.gz`; every release asset now names its target harness.
For contributor builds, use `node scripts/package.mjs <harness> [output]` or the
`npm run package:<harness>` entry points.

The managed CLI replaces positional-only bundle commands with explicit `install`
and `update` plus `--local --project`. Existing unmanaged file installs are not
adopted: preserve and move conflicting files yourself before installing. Native
marketplace/package-manager installations retain their own update lifecycle.

### Verification and releases

The harness CI runs real, pinned CLI installations in Docker, followed by
credential-free installation/discovery checks. Run the same matrix locally using
the commands in [Harness support](./reference/HARNESS_SUPPORT.md).
No model credentials are needed or mounted.

Version-tag releases build eight minimal, named harness packages. Installation CI
uses real CLIs/loaders and exercises unpacked project bundles and native packages;
Cursor's authenticated discovery remains explicitly skipped. Tags must match the
package and versioned native manifests. Claude directory notifications remain
version-triggered, and the website remains deployed through GitHub Pages.

Local verification passed: 35 tests and adapter synchronization, packed npm
install/update/conflict checks for all eight targets, and all eight pinned Docker
installation runs. Official project discovery passed for Codex, Pi, OMP, Gemini,
and OpenCode; Claude and Antigravity native plugin inventories passed separately.
Cursor discovery still requires authentication. A real filesystem-permission
failure also confirmed that a failed update restores changed files and
leaves ownership state unchanged. These checks invoke no models.
Maintainer setup for the existing package's GitHub OIDC trusted publisher is documented in
[Harness support](./reference/HARNESS_SUPPORT.md#npm-release-maintainer-setup).

Aider has no native custom-subagent/Agent Skills contract here and is not included
in the supported installation matrix.

## Reference

The [framework specification](./skills/scopewright-create/references/SCOPED_FRAMEWORK_V4.md)
and [review rubric](./skills/root-prompt-reviewer/references/ROOT_PROMPT_DESIGN_RUBRIC.md)
ship inside the skills that use them.

## License

MIT © Jonathon W. Marshall
