# Harness support

## Distribution and authority

`skills/` is the canonical source. Each skill includes its references; installing a
skill does not require cloning the surrounding repository. Native agents are generated
from the canonical reviewer with the full rubric embedded.

Eight harnesses are retained; Antigravity CLI is the recommended Google harness.

| Harness | Installation surface | Native adapter | Read-only boundary |
| --- | --- | --- | --- |
| Claude Code | Claude plugin marketplace / `--plugin-dir` | Root `agents/<name>.md` for plugins; `.claude/agents/<name>.md` for projects | Read/Glob/Grep allowlist; mutating and delegation tools disallowed |
| Codex | Agent Skills installer → `.agents/skills/` | `.codex/agents/<name>.toml` | Reduced features plus read-only **parent sandbox**; agent-file sandbox overrides are not supported |
| Pi | `pi install` → manifest `pi.skills: ["./skills"]` | None without an optional companion extension | Prompt-only in the current session |
| OhMyPi | Project `.omp/skills/` and `.omp/agents/` | `.omp/agents/<name>.md` | Built-in read/grep/glob allowlist; extension/MCP tools can still be additive |
| Antigravity CLI (recommended Google) | Build with `npm run package:antigravity`, then `agy plugin install ./dist/antigravity` | `.agents/agents/<name>.md`, staged into native plugin `agents/` | Declared `view_file`/`grep_search` allowlist and `commandExecutionPolicy: "off"`; runtime enforcement not established by inventory |
| Gemini CLI (legacy / enterprise / paid API-key) | Build with `npm run package:gemini`, then install `dist/gemini` or unpacked legacy release | `.gemini/agents/<name>.md`, staged into extension `agents/` | Explicit read_file/grep_search allowlist |
| OpenCode | Agent Skills installer → `.agents/skills/` | `.opencode/agents/<name>.md` | Default deny; read/glob/grep/list allowed |
| Cursor | Agent Skills installer or Cursor plugin | `.cursor/agents/<name>.md` | `readonly: true` and explicit no-mutation instructions |

Skills alone do **not** restrict the parent harness's tools or create isolated sessions.
For strict isolation, use native agents and the harness's sandbox/permission settings;
review inherited MCP and extension permissions. Prompt injection defenses complement
these controls but are not a security boundary.

Pi and OhMyPi are distinct harnesses. In particular, do not load this repository as an
OMP extension package: OMP would scan the root `agents/` directory, which contains
Claude plugin definitions. Install its native `.omp/` resources instead.

## Creation and invocation

The creator writes the same SCOPED body to a portable skill and the selected native
adapter, asking before overwriting. It uses a harness-specific skill directory when
`.agents/skills/` is not supported. Pi produces a skill only. Aider is not represented
by a misleading native adapter.

For bundled native agents installed by copying, copy the single adapter into its
native project directory. The embedded rubric makes that adapter self-contained.
A generic skills installer installs the portable skills, **not** the agent adapters.

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
```

Set `CONTAINER_ENGINE=podman` to use Podman explicitly. Images target Linux amd64.
The build context contains only the harness Dockerfile and smoke script.
Runtime containers use fresh temporary homes, a read-only repository mount, dropped
capabilities, and disabled networking; no host credentials enter the image or runtime.

| Harness | Pinned CLI | Discovery surface |
| --- | --- | --- |
| Claude Code | 2.1.307 | Plugin validation, marketplace install, plugin skill/native-agent inventory |
| Codex | 0.163.0 | Real skills installer and app-server `skills/list` |
| Pi | 1.4.0 (`@earendil-works/pi-coding-agent`) | `pi install` and official package-aware `DefaultResourceLoader` |
| OhMyPi | 18.12.6 (Bun 1.4.3) | Native deployment and official skill/task-agent loaders |
| Gemini CLI (legacy / enterprise / paid API-key) | 0.65.0 | Staged source and release-archive installs, `skills list`, official agent loader |
| Antigravity CLI | 1.4.5 | Staged source and release-archive installs, `agy plugin list --json` skills/agents inventory |
| OpenCode | 1.19.3 | Real skills installer, CLI skill/agent discovery and effective permissions |
| Cursor | 2026.10.19-6bbf2c4 | Actual binary/version/help; authenticated discovery skipped |

The base Node image is digest-pinned; Cursor and Antigravity archives are checksum-verified.
CLI versions and the skills installer are pinned, but npm transitive dependencies
are not lockfile-pinned. See `tests/harnesses/Dockerfile` for the full install commands.

A loader-level check does not prove model behavior or enforce tool restrictions at
inference time. Codex parses custom-agent TOML lazily at spawn; native agent execution
and validation remain unverified because its CLI exposes no offline inventory/parser.

Antigravity's real CLI verifies both skills, their bundled references, and the native
reviewer inventory after staged-source and unpacked-release installation.
Neither a successful install nor a skill/agent inventory proves delegation,
read-only enforcement, command-execution policy, or model behavior.

## CI/CD contracts

- Harness installation CI targets eight harnesses and checks generated adapters.
- Google release CI packages the native Antigravity plugin and separate legacy
  Gemini extension, validating installs and inventories without model execution.
  It preserves `scopewright.tar.gz` for Gemini and adds `scopewright-antigravity.tar.gz`.
  Tags must equal `v` plus the package version; Gemini's manifest version must match.
- Claude directory publication retains the version-change gate and webhook secrets;
  no webhook is sent for an unchanged plugin version.
- GitHub Pages continues to upload `site/`; website setup commands match the README.

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
