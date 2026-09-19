# Harness support matrix

Scopewright keeps the SCOPED reviewer body portable and adds native adapters only where
the harness has a supported custom-subagent format. This matrix was checked against the
linked vendor documentation in March 2026.

| Harness | Portable fallback | Native adapter | Read-only enforcement |
| --- | --- | --- | --- |
| Claude Code | Plugin skill | `.claude/agents/<name>.md` | `disallowedTools` |
| Pi | `skills/pi/` package resource / Agent Skills | No native subagents | Prompt-only |
| Codex | `.agents/skills/<name>/SKILL.md` | `.codex/agents/<name>.toml` | `sandbox_mode = "read-only"` |
| Gemini CLI | `.agents/skills/<name>/SKILL.md` | `.gemini/agents/<name>.md` | Explicit `read_file` / `grep_search` tool allowlist |
| OpenCode | `.agents/skills/<name>/SKILL.md` | `.opencode/agents/<name>.md` | `edit: deny`, `bash: deny` permissions |
| Cursor | `.agents/skills/<name>/SKILL.md` | `.cursor/agents/<name>.md` | `readonly: true` |
| Aider | None; use a checked-in prompt/conventions file | None | Aider has no custom-agent or Agent Skills surface |

## Adapter contract

Every adapter embeds the same S → C → O → P → E → D reviewer criteria. Native
frontmatter handles discovery, delegation, and the harness's strongest available
read-only control. The body still explicitly forbids mutation because a tool control
alone is not a complete safety boundary.

The portable creation skill writes both `.agents/skills/<name>/SKILL.md` and the
selected native adapter. It asks the user to select a native target when it cannot
infer one. Aider is deliberately reported as unsupported for native delegation instead
of being represented by a misleading adapter.

## Vendor references

- [Codex Skills](https://developers.openai.com/codex/skills/) and
  [Subagents](https://developers.openai.com/codex/subagents/)
- [Gemini CLI Agent Skills](https://geminicli.com/docs/cli/skills/) and
  [Subagents](https://geminicli.com/docs/core/subagents/)
- [OpenCode Skills](https://opencode.ai/docs/skills/) and
  [Agents](https://opencode.ai/docs/agents/)
- [Cursor Agent Skills](https://cursor.com/docs/skills) and
  [Subagents](https://cursor.com/docs/subagents)
- [Aider conventions](https://aider.chat/docs/usage/conventions.html)
