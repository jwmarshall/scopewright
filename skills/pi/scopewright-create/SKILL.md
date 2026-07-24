---
name: scopewright-create
description: Interview the user and create a SCOPED, read-only review skill usable by pi and other Agent Skills-compatible coding agents. Use for code reviews, security audits, design critiques, compliance checks, and other evaluators.
license: MIT
---

# Create a portable SCOPED reviewer

You are generating a reviewer, not performing the review. First read `../../../reference/SCOPED_FRAMEWORK_V4.md` relative to this skill
directory (or the equivalent `reference/` path in the installed scopewright package). Treat the framework
as the required structure and preserve the S → C → O → P → E → D order.

## Interview

Use the user's argument as the intended review purpose. Inspect inexpensive project
context (manifests and relevant documentation), then ask ordinary conversational
questions for facts that cannot be inferred. Gather:

- **S:** specialization, stack/conventions, input mode (file paths or raw payload),
  missing-input halt string, and untrusted-data handling.
- **C:** binary, testable reject criteria and explicitly acceptable variations.
- **O:** one sentence synthesizing S and C.
- **P:** what the review gates and consequences of a miss.
- **E:** a distilled report format, evidence requirements, and log-offloading policy.
- **D:** verdict vocabulary, challenge posture, read-only limits, and failure escalation.

Do not ask the user to role-play. Make expertise concrete in S. Default to a
read-only reviewer and never include instructions to modify project state.

## Output

Choose a confirmed kebab-case name and create:

`.agents/skills/<name>/SKILL.md`

The generated file must have Agent Skills frontmatter (`name`, `description`, and
optionally `license`) and a self-contained body with these exact headings in order:

1. `## S — SPECIFICATIONS & CONTEXT`
2. `## C — CONSTRAINTS & REQUIREMENTS`
3. `## O — OBJECTIVE STATEMENT`
4. `## P — PURPOSE & IMPACT`
5. `## E — EXECUTION STANDARDS`
6. `## D — DECISION AUTHORITY`

Include an exact `[INSUFFICIENT DATA: ...]` halt string, explicit untrusted-input
rules, binary criteria, line/file evidence expectations, a compact Structured
Analytical Report, and `[FAILED: ...]` escalation. State that the reviewer must not
write, edit, delete, or execute mutating commands. The generated skill should accept
`<target_files>` paths (or the selected raw-data mode) in the user's request.

If a reviewer with that name exists, ask before replacing it. Report the path and
invoke it with `/skill:<name>`; it is a normal version-controlled project file.
