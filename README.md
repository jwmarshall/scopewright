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

Install separately in each harness. Skills are instructions, not a security sandbox;
native subagents add the controls described in the [support matrix](./reference/HARNESS_SUPPORT.md).

### Claude Code

Register this repository as a marketplace, then install its plugin:

```bash
claude plugin marketplace add jwmarshall/scopewright
claude plugin install scopewright@scopewright
```

In Claude Code, run `/scopewright:scopewright-create [what the reviewer should evaluate]`.
For local development, use `claude --plugin-dir /absolute/path/to/scopewright`.

### Pi

```bash
pi install git:github.com/jwmarshall/scopewright
# Local checkout:
pi install /absolute/path/to/scopewright
```

Run `/skill:scopewright-create [what the reviewer should evaluate]`.
Pi loads the same `skills/` resources through `package.json`; no companion subagent
extension is required. Generated reviewers run as skills in the current session.

### OhMyPi

Install native resources from a checkout; preserve existing customizations first:

```bash
git clone https://github.com/jwmarshall/scopewright.git
cd scopewright
mkdir -p ~/.omp/agent/skills ~/.omp/agent/agents
cp -R skills/scopewright-create skills/root-prompt-reviewer ~/.omp/agent/skills/
cp .omp/agents/root-prompt-reviewer.md ~/.omp/agent/agents/
```

Restart OhMyPi, then use `/skill:scopewright-create`.
For project-only installation, copy those same resources to your project's
`.omp/skills/` and `.omp/agents/` instead.
Do not use `omp install` on this repository: OMP extension discovery scans root
`agents/`, which contains the Claude plugin adapter, not the OMP task agent.


### Antigravity CLI — recommended Google harness

```bash
git clone https://github.com/jwmarshall/scopewright.git
cd scopewright
npm run package:antigravity
agy plugin install ./dist/antigravity
```

Inspect installed skills and agents with `agy plugin list --json`. Ask Antigravity to
use `scopewright-create` and select `antigravity` when choosing the output harness.
Native reviewers use `.agents/agents/<name>.md`.

The build stages a native plugin from `.antigravity/plugin.json`, canonical skills,
and the generated `.agents/agents/root-prompt-reviewer.md`. Install the staged
directory, not the repository root. No dependencies are needed.

Installation and inventory do not prove model behavior or runtime tool enforcement.
See the [support matrix](./reference/HARNESS_SUPPORT.md) for verification limits.

Matching version tags publish `scopewright-antigravity.tar.gz`; unpack it and install
its directory with `agy plugin install`. The legacy Gemini archive remains separate.

### Gemini CLI — legacy / enterprise / paid API-key

Antigravity is Google's recommended successor for individual users.
[Google's June 18, 2026 transition](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/)
stopped individual free, Pro, and Ultra Gemini CLI requests.

Enterprise licenses and paid API-key access remain supported. This repository
retains the separate Gemini extension; it is not an Antigravity plugin.

```bash
git clone https://github.com/jwmarshall/scopewright.git
cd scopewright
npm run package:gemini
gemini extensions install ./dist/gemini
```

Use `/skills list` to inspect the skills, then ask Gemini to use `scopewright-create`.
The repository root is a Claude plugin, not a Gemini extension. The build stages
only the canonical skills, references, and Gemini reviewer. No dependencies are needed.
The release workflow publishes the same Gemini-only `scopewright.tar.gz` for matching
`v<version>` tags; unpack it and install its directory with `gemini extensions install`.

### Codex, OpenCode, and Cursor

Use the existing [skills installer](https://github.com/vercel-labs/skills) from your
target project; it copies each complete skill, including its references:

```bash
npx skills@1.7.4 add jwmarshall/scopewright --skill scopewright-create root-prompt-reviewer -a codex -y
# Replace codex with opencode or cursor for those harnesses.
```

This installs **skills only**, not native agents. Ask the harness to use
`scopewright-create`; Codex also supports `$scopewright-create`.
Cursor's plugin manifest remains available for marketplace submission; this
repository does not assume marketplace approval.

To use the bundled native reviewer outside a plugin/extension, copy its adapter
from a checkout into the matching directory in your target project:

```bash
# Example: Codex
mkdir -p .codex/agents
cp /absolute/path/to/scopewright/.codex/agents/root-prompt-reviewer.toml .codex/agents/
```

The bundled adapters embed the rubric, so they do not depend on files outside the
copied adapter. Do not overwrite an existing customized reviewer.

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
`package.json` and Claude/Cursor plugin manifests expose that tree directly.
`npm run package:antigravity` stages a native Antigravity plugin;
`npm run package:gemini` stages the separate legacy Gemini extension.

The canonical reviewer lives in `skills/root-prompt-reviewer/SKILL.md`.
`npm run sync:agents` generates the harness adapters; `npm run check` rejects drift.
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

These conventions are adopted without adding a custom universal installer or runtime
dependency. See the [support matrix](./reference/HARNESS_SUPPORT.md) for vendor sources.

### Migration

The old `skills/create`, `pi-skills/`, and checked-in `.agents/skills/` copies are
removed. Reinstall through the commands above; replace `/scopewright:create` with
`/scopewright:scopewright-create`. Remove old installed copies only after preserving
any local customizations. Generated reviewers in your own projects are not migrated
or overwritten automatically.

The framework and rubric moved into their owning skill's `references/` directory.
Update external links to those paths. No compatibility aliases remain.
Direct Gemini installation from this Git repository is replaced by clone → build →
install, or installation of the unpacked Gemini-only release archive.

### Verification and releases

The harness CI runs real, pinned CLI installations in Docker, followed by
credential-free installation/discovery checks. Run the same matrix locally using
the commands in [Harness support](./reference/HARNESS_SUPPORT.md).
No model credentials are needed or mounted.

Google releases validate separate native Antigravity and legacy Gemini packages,
including installs from unpacked release archives. Tags must match the package and
Gemini extension version. Claude directory notifications remain version-triggered,
and the website remains deployed through GitHub Pages.

Aider has no native custom-subagent/Agent Skills contract here and is not included
in the supported installation matrix.

## Reference

The [framework specification](./skills/scopewright-create/references/SCOPED_FRAMEWORK_V4.md)
and [review rubric](./skills/root-prompt-reviewer/references/ROOT_PROMPT_DESIGN_RUBRIC.md)
ship inside the skills that use them.

## License

MIT © Jonathon W. Marshall
