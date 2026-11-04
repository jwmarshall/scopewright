# Harness support

## Distribution and authority

`skills/` is the canonical source. Each skill includes its references; installing a
skill does not require cloning the surrounding repository. Native agents are generated
from the canonical reviewer with the full rubric embedded.

Eight harnesses are retained; Antigravity CLI is the recommended Google harness.

| Harness | Installation surface | Native adapter | Read-only boundary |
| --- | --- | --- | --- |
| Claude Code | Native marketplace first; managed project CLI `--harness claude` alternative | Root `agents/<name>.md` for plugins; `.claude/agents/<name>.md` for projects | Read/Glob/Grep allowlist; mutating and delegation tools disallowed |
| Codex | Managed project CLI `--harness codex`; offline bundle alternative | `.codex/agents/<name>.toml` | Reduced features plus read-only **parent sandbox**; agent-file sandbox overrides are not supported |
| Pi | `pi install --local npm:scopewright` from the project; direct Git or managed CLI `--harness pi` alternatives | None without an optional companion extension | Prompt-only in the current session |
| OhMyPi | Managed project CLI `--harness omp`; native OMP-only archive alternative | Native `.omp/agents/<name>.md`, staged into package `agents/` | Built-in read/grep/glob allowlist; extension/MCP tools can still be additive |
| Antigravity CLI (recommended Google) | Managed project CLI `--harness antigravity`; native plugin archive alternative | `.agents/agents/<name>.md`, staged into native plugin `agents/` | Declared `view_file`/`grep_search` allowlist and `commandExecutionPolicy: "off"`; runtime enforcement not established by inventory |
| Gemini CLI (legacy / enterprise / paid API-key) | Managed project CLI `--harness gemini`; separate native extension archive alternative | `.gemini/agents/<name>.md`, staged into extension `agents/` | Explicit read_file/grep_search allowlist |
| OpenCode | Managed project CLI `--harness opencode`; offline bundle alternative | `.opencode/agents/<name>.md` | Default deny; read/glob/grep/list allowed |
| Cursor | Managed project CLI `--harness cursor`; offline bundle or native plugin alternative | `.cursor/agents/<name>.md` | `readonly: true` and explicit no-mutation instructions |

Skills alone do **not** restrict the parent harness's tools or create isolated sessions.
For strict isolation, use native agents and the harness's sandbox/permission settings;
review inherited MCP and extension permissions. Prompt injection defenses complement
these controls but are not a security boundary.

Pi and OhMyPi are distinct harnesses. Do not run `omp install` on this repository
root: its `agents/` contains Claude plugin definitions. The root Scopewright CLI
selects the OMP adapter correctly with `--harness omp`. Native OMP users can unpack
`scopewright-omp.tar.gz` and run `omp install /absolute/path/to/unpacked-omp-package`.
That install links its package directory: keep it, restart OMP, and stage native
updates at a fresh path. Existing user/project agents take precedence.

## Managed project CLI

The managed CLI requires Scopewright **0.3.0+** and Node.js 22+. Version 0.2.0
provides skills but has no project CLI. Prefer the native Claude marketplace or
Pi package where appropriate:

```bash
npx scopewright@latest install --harness omp --local --project /absolute/path/to/project
npx scopewright@latest update --harness omp --local --project /absolute/path/to/project
```

All eight `--harness` values in the table are supported. `--project` must be an
existing directory and defaults to cwd; `--local` is optional but recommended.
There is no global mode or home-configuration write. `--help` and `--version` are
supported. Fetching `@latest` does not update files by itself: invoke `update`
explicitly for the selected previously-managed harness.

An existing source checkout can run the equivalent command without a build:

```bash
node /path/to/scopewright/scripts/install.mjs install --harness omp --local --project /path/to/project
node /path/to/scopewright/scripts/install.mjs update --harness omp --local --project /path/to/project
```

No build or dependency installation is needed. Claude copies use `.claude/skills/`
and `.claude/agents/`; Pi uses `.pi/skills/` only; OMP uses `.omp/skills/` and
`.omp/agents/`; Gemini uses `.gemini/skills/` and `.gemini/agents/`. Codex, OpenCode,
Cursor, and Antigravity share `.agents/skills/`, with native adapters in
`.codex/agents/`, `.opencode/agents/`, `.cursor/agents/`, and `.agents/agents/`
respectively. All skill references are copied, and generated agent bodies are
reused without transformation.

Ownership lives in `.scopewright/install.json`: per-file SHA-256 hashes and harness
owners, plus last installed version per harness. `install` only accepts absent
files or unchanged managed files; `update` requires prior ownership for its selected
harness. Both refresh selected resources and remove obsolete unchanged files only
when no remaining harness owns them. Refreshing shared `.agents/skills/` resources
updates the content/hash for all owners, without updating other native adapters.
Unrelated project files remain untouched.

Edited managed files, existing unmanaged destination files, symlinks, and internal
symlink ancestors/resources cause a preflight failure before resource writes, with
no changes. An explicit project-root alias is accepted; internal symlinks are not.
There is no force mode, backup/merge automation, or adoption of unmanaged installs.
To migrate older copies, the user must back up and move conflicting files outside
the target paths before `install`. Preserve edits to managed resources, then restore
the recorded version or move conflicting files aside before retrying. Keep ownership
state rather than deleting it to bypass conflicts. Project copies are self-contained:
the package directory or npm cache can be removed after successful installation.

## Harness-specific archives and contributor builds

Release archives are the secondary/offline channel. Version-tag releases produce
`scopewright-<harness>.tar.gz` for `claude`, `codex`, `pi`, `omp`, `antigravity`,
`gemini`, `opencode`, and `cursor`. Unpack only the matching archive. All include
complete canonical skills with references and `LICENSE`, but only the selected
adapter/manifest. Pi deliberately contains no native agent. Claude and Cursor keep
their distinct native plugin manifests; Cursor's logo is bundled locally. No
runtime extension code or dependencies are installed. Archives can be relocated
independently of the checkout. The former ambiguous `scopewright.tar.gz` asset is
replaced by `scopewright-gemini.tar.gz`.

Codex, OpenCode, and Cursor archives bundle the same managed project interface and
infer the selected harness from their metadata:

```bash
node /absolute/path/to/unpacked-package/install.mjs install --local --project /absolute/path/to/project
node /absolute/path/to/new-unpacked-package/install.mjs update --local --project /absolute/path/to/project
```

The old positional-only interface is removed. Native local Pi/OMP packages and
Claude `--plugin-dir` usage depend on their source directory remaining available;
managed file copies do not.

For contributors, `npm run package:<harness>` stages a minimal archive layout in
`dist/<harness>`; `npm run package:all` stages all eight. The underlying CLI is
`node scripts/package.mjs <harness|all> [output-directory]`. It checks prerequisites
and rejects existing output directories instead of merging stale files. Build at a
fresh path to create replacement native packages; this is not a managed project
update command. End users do not need to clone or build.


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

Use Antigravity CLI for new Google installations. Prefer project-native files via
the managed CLI; after the 0.3.0 npm release:

```bash
npx scopewright@latest install --harness antigravity --local --project /absolute/path/to/project
npx scopewright@latest update --harness antigravity --local --project /absolute/path/to/project
```

Until 0.3.0 publication, use the source CLI equivalent from the managed-install section,
changing `--harness` to `antigravity`. No clone/build is needed when using a published
package. Ask the creator to use `antigravity`. Project-native reviewers go in
`.agents/agents/<name>.md`; portable project skills use `.agents/skills/`.

For native plugin registration instead, unpack `scopewright-antigravity.tar.gz`:

```bash
agy plugin install /absolute/path/to/unpacked-antigravity-package
agy plugin list --json
```

The native plugin build uses `.antigravity/plugin.json`, canonical `skills/`, and
the generated `.agents/agents/root-prompt-reviewer.md`. The archive contains root
`plugin.json`, `skills/`, `agents/`, and `LICENSE`.

The Antigravity manifest declares a name and description, not a version. Release
versioning comes from the package version and matching Git tag.
The repository root and `.gemini/` extension are not native Antigravity plugins.

[Google's transition announcement](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/)
states that individual free, Pro, and Ultra Gemini CLI requests stopped June 18,
2026. Enterprise licenses and paid API keys remain supported.

Gemini CLI is therefore retained as a legacy / enterprise / paid API-key harness,
not described as universally retired. Its `gemini extensions install` path remains
separate from Antigravity's `agy plugin install`.

Gemini project files use the same explicit commands with `--harness gemini`.
For native extension registration, unpack `scopewright-gemini.tar.gz` and run
`gemini extensions install /absolute/path/to/unpacked-gemini-package`.

Antigravity uses plugins in place of Gemini extensions. Preserve customized skills
and agents before migrating; install the matching package rather than renaming a
Gemini extension manifest. Existing project reviewers are not rewritten.

## Docker verification

**Cutover verification:** packed npm install/update/conflict checks and all eight
pinned Docker installation runs passed locally. Project skill/agent discovery
passed through the official CLI/loaders for Codex, Pi, OMP, Gemini, and OpenCode,
subject to the native-agent limits below. Claude and Antigravity native plugin
inventories passed; their npm project files were copied/updated but lack an offline
project inventory check. Cursor authenticated discovery remains skipped.
Native package inventory does not prove model behavior or runtime enforcement.

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
| Codex | 0.163.0 | Relocated bundle and packed npm project installs, app-server `skills/list`; native TOML execution remains unverified |
| Pi | 1.4.0 (`@earendil-works/pi-coding-agent`) | Minimal native package and packed npm project skills through official `DefaultResourceLoader` |
| OhMyPi | 18.12.6 (Bun 1.4.3) | Native package and packed npm project skill/task-agent discovery, parsed built-in tool allowlist |
| Gemini CLI (legacy / enterprise / paid API-key) | 0.65.0 | Native source/archive and packed npm project installs, `skills list`, official agent loader |
| Antigravity CLI | 1.4.5 | Staged source and release-archive installs, `agy plugin list --json` skills/agents inventory |
| OpenCode | 1.19.3 | Relocated bundle and packed npm project installs, CLI skill/agent discovery and effective permissions |
| Cursor | 2026.10.19-6bbf2c4 | Bundle/npm project installation and actual binary/version/help; authenticated discovery skipped |

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
- Release CI builds all eight named `scopewright-<harness>.tar.gz` archives and the
  root npm tarball. It verifies the packed CLI/resources and native/project paths
  without credentials or model execution before allowing publication.
  Tags must equal `v` plus the package version; versioned native manifests must match.
- npm publication is gated on validation and all eight harness-install jobs; the
  publish job uses the exact root tarball produced by validation, not a rebuild.
  Trusted publishing requires the manual npm setup below and has not been exercised.
- Claude directory publication retains the version-change gate and webhook secrets;
  no webhook is sent for an unchanged plugin version.
- GitHub Pages continues to upload `site/`; website setup commands match the README.

Build the same release archives locally without publishing:

```bash
node .github/scripts/package-release.mjs /absolute/path/to/fresh-release-directory
# Also enforce a prospective tag:
RELEASE_TAG=v0.3.0 node .github/scripts/package-release.mjs /absolute/path/to/another-fresh-directory
```

The release directory contains staged `packages/` plus the eight named archives.
Existing output directories are refused; release creation never cleans user files.


Production publication requires GitHub permissions and channel-specific setup.
Claude directory webhooks still require their existing secrets; npm uses OIDC,
not an npm token secret. Cursor marketplace approval is separate and not assumed.
Local packaging/verification does not publish anything.

### npm release maintainer setup

The npm package `scopewright` is maintained by `jwmarshall`. Version **0.3.0**
introduces the managed project CLI; version 0.2.0 is skills-only. npm versions are
immutable: always bump the package and versioned manifests for a new release.

An authorized package owner must manually configure npm trusted publishing for the
existing package. Confirm npm owner permissions, account/2FA requirements, and the
packed contents before releasing. Package ownership cannot be claimed by requesting
an OIDC token, but no new package/bootstrap publication is needed here.

Add a **GitHub Actions trusted publisher** in the existing npm package's publishing
settings with these exact values:

| npm trusted publisher field | Value |
| --- | --- |
| Organization or user | `jwmarshall` |
| Repository | `scopewright` |
| Workflow filename | `release-harness-packages.yml` |
| Environment | leave blank (no GitHub environment is selected) |

The workflow lives at `.github/workflows/release-harness-packages.yml`. Its npm
publish job alone receives `id-token: write`, uses Node.js 24 and a trusted-publishing
capable npm CLI (11.5.1+), and depends on validation plus all eight installation
matrix jobs. Do not add an `NPM_TOKEN` secret as a substitute for the trusted
publisher binding. Existing native release assets and Claude notifications keep
their separate channel contracts.

Only release a tag matching the root package version and versioned native manifests.
The publish job downloads the already-verified npm tarball from validation and
publishes that artifact, rather than repacking a potentially different tree.
Before enabling automated production releases, complete npm-side setup and run the
checks. Local npm authentication is separate from GitHub OIDC; a successful local
publish does not validate trusted publishing. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers)
for account and runner prerequisites.

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
