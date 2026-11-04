# Harness support

## Distribution and authority

`skills/` is the canonical source. Each skill includes its references; installing a
skill does not require cloning the surrounding repository. Native agents are generated
from the canonical reviewer with the full rubric embedded.

Eight harnesses are retained; Antigravity CLI is the recommended Google harness.

| Harness | Installation surface | Native adapter | Read-only boundary |
| --- | --- | --- | --- |
| Claude Code | Marketplace, or `npm run package:claude` → native plugin directory | Root `agents/<name>.md` for plugins; `.claude/agents/<name>.md` for projects | Read/Glob/Grep allowlist; mutating and delegation tools disallowed |
| Codex | `npm run package:codex` → bundled project installer | `.codex/agents/<name>.toml` | Reduced features plus read-only **parent sandbox**; agent-file sandbox overrides are not supported |
| Pi | `npm run package:pi` → `pi install ./dist/pi` | None without an optional companion extension | Prompt-only in the current session |
| OhMyPi | Build with `npm run package:omp`, then `omp install ./dist/omp`; project-only copies under `.omp/` | Native `.omp/agents/<name>.md`, staged into package `agents/` | Built-in read/grep/glob allowlist; extension/MCP tools can still be additive |
| Antigravity CLI (recommended Google) | Build with `npm run package:antigravity`, then `agy plugin install ./dist/antigravity` | `.agents/agents/<name>.md`, staged into native plugin `agents/` | Declared `view_file`/`grep_search` allowlist and `commandExecutionPolicy: "off"`; runtime enforcement not established by inventory |
| Gemini CLI (legacy / enterprise / paid API-key) | Build with `npm run package:gemini`, then install `dist/gemini` or unpacked legacy release | `.gemini/agents/<name>.md`, staged into extension `agents/` | Explicit read_file/grep_search allowlist |
| OpenCode | `npm run package:opencode` → bundled project installer | `.opencode/agents/<name>.md` | Default deny; read/glob/grep/list allowed |
| Cursor | `npm run package:cursor` → bundled project installer or native Cursor plugin | `.cursor/agents/<name>.md` | `readonly: true` and explicit no-mutation instructions |

Skills alone do **not** restrict the parent harness's tools or create isolated sessions.
For strict isolation, use native agents and the harness's sandbox/permission settings;
review inherited MCP and extension permissions. Prompt injection defenses complement
these controls but are not a security boundary.

Pi and OhMyPi are distinct harnesses. Do not install this repository root as an
OMP extension package: its `agents/` contains Claude plugin definitions.
`npm run package:omp` stages an OMP-only `package.json`, canonical skills with their
references, native `.omp/agents/`, and `LICENSE`. `omp install ./dist/omp` links that
directory; keep it on disk and restart OMP. Existing user/project agents take
precedence. The builder refuses existing destinations; stage updates at a new path.
Project-only copies into `.omp/skills/` and `.omp/agents/` remain supported.

## Harness-specific packages

`npm run package:<harness>` stages a minimal package in `dist/<harness>`.
`npm run package:all` stages all eight. All packages include complete canonical
skills with their references and `LICENSE`, but only the selected harness's adapter
and manifest. Pi deliberately contains no native agent. Claude and Cursor packages
retain their distinct native plugin manifests; the Cursor logo is bundled locally.
No package installs runtime extension code or dependencies.

The packaging CLI is `node scripts/package.mjs <harness|all> [output-directory]`.
It checks source prerequisites and rejects existing output directories rather than
merging stale files. To update, build at a fresh path and install that package.

Version-tag releases publish `scopewright-<harness>.tar.gz` for `claude`, `codex`,
`pi`, `omp`, `antigravity`, `gemini`, `opencode`, and `cursor`. Unpack the matching
archive; its contents are the same layout as the staged package. All resource paths
are package-local, so archives can be relocated independently of the checkout.
The former ambiguous Gemini asset `scopewright.tar.gz` is no longer published;
use `scopewright-gemini.tar.gz`.

Codex, OpenCode, and Cursor bundles include a project-only installer:

```bash
node /absolute/path/to/unpacked-package/install.mjs /absolute/path/to/existing-project
```

It installs both skills under `.agents/skills/` and the native reviewer under the
matching `.codex/agents/`, `.opencode/agents/`, or `.cursor/agents/` directory.
It refuses existing skill/agent destinations, including symlinks, and symlinked
destination ancestors before copying resources. It preserves unrelated project
files and changes no global configuration. There is no force/overwrite mode.
For updates, preserve customizations and move existing owned destinations aside
before installing. Project installations are copies; the source package is no longer
needed afterward. Local Pi/OMP installs and Claude `--plugin-dir` usage instead
depend on the package directory remaining available.


## Creation and invocation

The creator writes the same SCOPED body to a portable skill and the selected native
adapter, asking before overwriting. It uses a harness-specific skill directory when
`.agents/skills/` is not supported. Pi produces a skill only. Aider is not represented
by a misleading native adapter.

The project installers deploy the complete skills and native adapter together.
For manual installation, the single generated adapter remains self-contained
because it embeds its rubric. A generic skills installer installs portable skills,
**not** native agent adapters.

## Provider-neutral model selection

Bundled adapters inherit the parent session's provider and model. Antigravity and
Cursor declare `model: inherit`; Claude Code, Codex, OhMyPi, Gemini CLI, and OpenCode
omit model/provider fields. Pi's portable skills run in the current session and
contain no model configuration. No bundled adapter selects a vendor, model ID, or
thinking level based on the reviewer's role.

The creator follows the same default. Explicit user-requested pins use only fields
supported by the installed harness; availability and authentication limits must be
disclosed. A provider ID identifies a connection, not just a vendor: do not replace
a subscription-backed provider with an API-key-backed provider automatically.
Never silently substitute a different provider or an assumed equivalent model.

Companion extensions have independent defaults. In `@tintinweb/pi-subagents`, remove
an ejected agent's `model` field to inherit; do not emit a literal `model: inherit`
for this extension. Its agent configuration can outrank the caller's model argument.
Override the exact agent name and preserve its prompt/tool controls rather than
patching installed dependencies. See the [README](../README.md#provider-and-model-selection)
for the built-in `Explore` workaround.

Fast/balanced/reasoning profiles are a possible harness-level optimization, not a
Scopewright runtime feature. They require explicit user mappings, capability and
provider checks, visible effective-model reporting, and parent-model fallback when
an unpinned profile has no mapping. An explicit unavailable pin should produce a
clear error, not an implicit fallback. Model inventory alone does not prove that
credentials will refresh or an inference request will succeed.

`npm test` checks metadata in all eight generated adapters and both portable skills,
rejects provider/model pins and thinking-level defaults, and exercises generation
in a fresh temporary directory. These are configuration-contract tests, not
model-backed cross-provider execution tests.

## Google harnesses and migration

Use Antigravity CLI for new Google installations:

```bash
git clone https://github.com/jwmarshall/scopewright.git
cd scopewright
npm run package:antigravity
agy plugin install ./dist/antigravity
agy plugin list --json
```

Ask the creator to use `antigravity`. Project-native reviewers go in
`.agents/agents/<name>.md`; portable project skills use `.agents/skills/`.
Antigravity's global skills directory is `~/.gemini/antigravity-cli/skills/`.

The native plugin build uses `.antigravity/plugin.json`, canonical `skills/`, and
the generated `.agents/agents/root-prompt-reviewer.md`. It stages root `plugin.json`,
`skills/`, `agents/`, and `LICENSE` in `dist/antigravity`.

The Antigravity manifest declares a name and description, not a version. Release
versioning comes from the package version and matching Git tag.
The repository root and `.gemini/` extension are not native Antigravity plugins.

[Google's transition announcement](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/)
states that individual free, Pro, and Ultra Gemini CLI requests stopped June 18,
2026. Enterprise licenses and paid API keys remain supported.

Gemini CLI is therefore retained as a legacy / enterprise / paid API-key harness,
not described as universally retired. Its `gemini extensions install` path remains
separate from Antigravity's `agy plugin install`.

Antigravity uses plugins in place of Gemini extensions. Preserve customized skills
and agents before migrating; install the matching package rather than renaming a
Gemini extension manifest. Existing project reviewers are not rewritten.

## Docker verification

The installation matrix installs actual pinned harness binaries in clean containers.
Discovery must use the harness CLI or its installed official loader, not filename or
README regex checks. Model execution is intentionally excluded: no credentials are
required or mounted. Cursor is the explicit exception: its CLI installs and runs,
but plugin inventory requires authentication. CI reports that discovery step as
**skipped**, never as verified; install failures still fail the job.

Run the same smoke matrix locally from the repository root:

```bash
npm run check
node .github/scripts/test-harness-install.mjs all
# One harness, or separate image build from offline execution:
node .github/scripts/test-harness-install.mjs antigravity --build-only
node .github/scripts/test-harness-install.mjs antigravity --run-only
# Native portable harness on ARM hosts (avoids amd64 emulation):
HARNESS_PLATFORM=linux/arm64 node .github/scripts/test-harness-install.mjs opencode
# OMP can also override its platform independently:
OMP_PLATFORM=linux/arm64 node .github/scripts/test-harness-install.mjs omp
```

Set `CONTAINER_ENGINE=podman` to use Podman explicitly. Images default to Linux amd64.
`HARNESS_PLATFORM=linux/arm64` selects native, separately tagged images with a pinned
arm64 Node base for Claude, Codex, Pi, OMP, Gemini, and OpenCode.
`OMP_PLATFORM` overrides that choice only for OMP. Antigravity and Cursor reject ARM
because their pinned archives are amd64-only; run those harnesses separately with
the default platform rather than selecting `all` with an ARM override.
The build context contains only the Dockerfile and smoke script. `--run-only` mounts
the current smoke script into the cached pinned image, so smoke-only changes do not
require reinstalling harness dependencies.
Runtime containers use fresh temporary homes, a read-only repository mount, dropped
capabilities, and disabled networking; no host credentials enter the image or runtime.

| Harness | Pinned CLI | Discovery surface |
| --- | --- | --- |
| Claude Code | 2.1.307 | Staged plugin validation, local marketplace install, plugin skill/native-agent inventory |
| Codex | 0.163.0 | Relocated project bundle installation and app-server `skills/list`; native TOML execution remains unverified |
| Pi | 1.4.0 (`@earendil-works/pi-coding-agent`) | Minimal package `pi install` and official package-aware `DefaultResourceLoader` |
| OhMyPi | 18.12.6 (Bun 1.4.3) | OMP-only package staging, real `omp install`/plugin inventory, official package skill/task-agent loaders and parsed built-in tool allowlist |
| Gemini CLI (legacy / enterprise / paid API-key) | 0.65.0 | Staged source and release-archive installs, `skills list`, official agent loader |
| Antigravity CLI | 1.4.5 | Staged source and release-archive installs, `agy plugin list --json` skills/agents inventory |
| OpenCode | 1.19.3 | Relocated project bundle installation, CLI skill/agent discovery and effective permissions |
| Cursor | 2026.10.19-6bbf2c4 | Relocated project bundle installation and actual binary/version/help; authenticated discovery skipped |

The base Node images are digest-pinned; Cursor and Antigravity archives are
checksum-verified. CLI versions are pinned, but npm transitive dependencies are
not lockfile-pinned. See `tests/harnesses/Dockerfile` for full install commands.

A loader-level check does not prove model behavior or enforce tool restrictions at
inference time. Codex parses custom-agent TOML lazily at spawn; native agent execution
and validation remain unverified because its CLI exposes no offline inventory/parser.

Antigravity's real CLI verifies both skills, their bundled references, and the native
reviewer inventory after staged-source and unpacked-release installation.
Neither a successful install nor a skill/agent inventory proves delegation,
read-only enforcement, command-execution policy, or model behavior.

## CI/CD contracts

- Harness installation CI targets eight harnesses, checks generated adapters and
  installer safety behavior, and exercises minimal packages through real CLIs/loaders.
- Release CI builds all eight harness-specific packages and publishes only named
  `scopewright-<harness>.tar.gz` archives. Native installation paths and relocated
  project bundles are verified without credentials or model execution.
  Tags must equal `v` plus the package version; versioned native manifests must match.
- Claude directory publication retains the version-change gate and webhook secrets;
  no webhook is sent for an unchanged plugin version.
- GitHub Pages continues to upload `site/`; website setup commands match the README.

Build the same release archives locally without publishing:

```bash
node .github/scripts/package-release.mjs /absolute/path/to/fresh-release-directory
# Also enforce a prospective tag:
RELEASE_TAG=v0.2.0 node .github/scripts/package-release.mjs /absolute/path/to/another-fresh-directory
```

The release directory contains staged `packages/` plus the eight named archives.
Existing output directories are refused; release creation never cleans user files.


Production publication requires GitHub permissions, existing secrets, and (for the
Cursor marketplace) external approval. Local verification does not publish anything.

## Prior art

- [Superpowers](https://github.com/obra/superpowers): shared `skills/`, native manifests,
  and per-harness installation. [Package manifest](https://github.com/obra/superpowers/blob/main/package.json)
  exposes the same skill tree to Pi.
- [Vercel skills](https://github.com/vercel-labs/skills): whole-skill installation to
  [documented agent paths](https://github.com/vercel-labs/skills/blob/main/docs/agents.md),
  rather than separate authored copies per harness.
- [Agent Skills specification](https://agentskills.io/specification): portable
  frontmatter with skill-local `references/`.

## Vendor references

- [Claude plugins](https://code.claude.com/docs/en/plugins-reference) and
  [subagents](https://code.claude.com/docs/en/sub-agents)
- [Codex skills](https://developers.openai.com/codex/skills/) and
  [subagents](https://developers.openai.com/codex/subagents/)
- [Pi packages](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/packages.md)
  and [skills](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/skills.md)
- [OhMyPi skills](https://github.com/can1357/oh-my-pi/blob/main/docs/skills.md) and
  [agent discovery](https://github.com/can1357/oh-my-pi/blob/main/docs/task-agent-discovery.md)
- [Antigravity plugins](https://antigravity.google/docs/plugins?tab=cli),
  [subagents](https://antigravity.google/docs/subagents?tab=cli), and
  [CLI setup](https://antigravity.google/docs/getting-started?tab=cli)
- [Google's Gemini CLI transition announcement](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/)
- [Legacy Gemini extension reference](https://geminicli.com/docs/extensions/reference/) and
  [subagents](https://geminicli.com/docs/core/subagents/)
- [OpenCode skills](https://opencode.ai/docs/skills/),
  [agents](https://opencode.ai/docs/agents/), and [permissions](https://opencode.ai/docs/permissions/)
- [Cursor skills](https://cursor.com/docs/skills) and
  [subagents](https://cursor.com/docs/subagents)
