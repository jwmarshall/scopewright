# Root Prompt Design Rubric (`CLAUDE.md` / `AGENTS.md`)

## Preamble

This rubric governs the authoring and review of repository root prompts (e.g.
`CLAUDE.md`, `AGENTS.md`, `.cursorrules`). Unlike Commands (human-triggered) or Skills
(atomic actions), the Root Prompt acts as the continuous System Prompt for the agent in
the repository. Because this file is injected into the context window on *every* single
interaction, it is subject to the most extreme token-efficiency and structural
constraints in the ecosystem. Every wasted token here is a compounding tax on the
agent's memory.

## 1. Core Principles of a Root Prompt

- **The "Tax" Principle:** If an instruction applies to only ~10% of tasks, it belongs
  in a Command or a Skill, not the root prompt. The root prompt must only contain
  universal repository laws.
- **Imperative Density:** Zero conversational filler. No "Please," "You are a helpful
  assistant," or "I would like you to."
- **Structural Parsing:** LLMs parse structured text (Markdown headers, XML tags) far
  better than paragraphs of prose.

## 2. Required Architectural Ordering

Root prompts must follow a strict dependency-first ordering (similar to the SCOPED
framework's underlying philosophy) so the model establishes its bounds before acting.

1. **Identity & Global Posture:** the strict bounds of the agent's autonomy in this
   repository.
2. **Tech Stack & Environment:** the immutable facts of the codebase (versions,
   frameworks).
3. **Universal Guardrails:** absolute "Never do this" constraints (e.g. security, DB
   mutations).
4. **Workflow & Orchestration Routing:** explicit pointers to `/commands` or subagents
   for specific workflows, to offload context.

## 3. Body Standards & Constraints

### XML Tagging for Bounding (Anti-Bleed)
- **Rule:** Distinct logical sections (e.g. rules, architecture, routing) must be
  encapsulated in XML tags (e.g. `<architecture>`, `<core_rules>`). This prevents
  instructions from bleeding into one another and improves retrieval accuracy.

### The "Show, Don't Tell" Code Standard
- **Rule:** Do not describe coding styles in paragraphs (e.g. "Always use early returns
  and functional paradigms"). Provide a single, highly dense, XML-wrapped code block
  demonstrating the perfect standard.

### Delegation & Routing (Context Offloading)
- **Rule:** A root prompt must not contain 100-step procedures for complex tasks (like
  deployments). It must act as a router.
- **Example:** "For PR reviews, do not review manually. You MUST route the user to
  `/review-pr` to invoke the review subagent."

### Token Efficiency (The Extreme Removal Test)
- **Rule:** Sentences must be stripped of all rationale unless the rationale is required
  for a conditional judgment.
- **Fail:** "Please make sure to never commit secrets to the repo because it is a
  security risk and violates our SOC2."
- **Pass:** "NEVER commit secrets. Violates SOC2."

## 4. Root Prompt Scoring Rubric

| Dimension | Pass Criteria (must meet ALL) | Fail Criteria (any of these) |
|---|---|---|
| **Token Economy** | Terse, imperative language. Fails the removal test (nothing left to cut). | Conversational filler ("Please", "Let's think"). Explains *why* unnecessarily. |
| **Universality** | Contains ONLY rules that apply to 100% of interactions in the repo. | Includes hyper-specific task instructions (belongs in a Command/Skill). |
| **Architectural Ordering** | Follows Context → Stack → Guardrails → Routing order. | Mixes tech-stack definitions with behavioral rules randomly. |
| **XML Structuring** | Uses XML tags (e.g. `<stack>`, `<rules>`) to bound context areas. | Relies entirely on unstructured prose paragraphs. |
| **Safety Guardrails** | Explicitly defines global destructive boundaries (e.g. "Do not bypass ORM," "Ask before deleting"). | Lacks universal safety constraints, assuming default model safety. |
| **Delegation Routing** | Acts as an orchestrator by pointing to available `/commands` and subagents for complex tasks. | Attempts to define complex workflows directly within the root file. |
