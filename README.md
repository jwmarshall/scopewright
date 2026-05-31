# scopewright

> _scope_ (examine under a scope) + _-wright_ (a maker, as in playwright/shipwright):
> a maker of SCOPED reviewers.

**scopewright** scaffolds read-only **review subagents** for Claude Code, built on
the [SCOPED framework](./reference/SCOPED_FRAMEWORK_V4.md). It doesn't review your
code — it interviews you and _writes a reviewer_ tailored to your project. You supply
the domain (runtime, language, criteria, stakes); scopewright prescribes the form:
dependency-ordered S/C/O/P/E/D structure, strict read-only constraints, prompt-injection
defenses, and clear verdict authority.

## Usage

```
/scopewright:create [what the reviewer should evaluate]
```

The skill will:

1. Read the bundled SCOPED specification.
2. Inspect your project and interview you for each SCOPED section (Specifications,
   Constraints, Objective, Purpose, Execution standards, Decision authority).
3. Write a tailored review subagent to `.claude/agents/<name>.md` — configured
   read-only (`Write`/`Edit`/`NotebookEdit` disallowed) so it can only return verdicts,
   never mutate state.

The result is an ordinary project subagent you can invoke, edit, and version. Re-run
the skill to build additional reviewers (security audit, contract review, design
critique, writing feedback, data-quality checks, and so on).

## What it produces

A SCOPED reviewer follows the framework's six sections in dependency order and:

- treats all acquired data (file contents or raw payloads) as **untrusted input**;
- halts with an explicit `[INSUFFICIENT DATA: …]` string when context is missing;
- returns a distilled **Structured Analytical Report**, offloading bulky output to
  `.agents/logs/` rather than dumping it into the chat;
- issues verdicts (e.g. `[APPROVED]` / `[REJECTED]`) to its Caller and escalates with
  `[FAILED: …]` instead of acting on state or asking humans directly.

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

The quality bar for the **output itself**: a distilled Structured Analytical Report,
a strict prohibition on dumping raw data or logs back into the chat, and instructions
to offload bulky output to `.agents/logs/` and return only the path. _Why it matters:_
this is what keeps a subagent from polluting the caller's context — protecting tokens
and reasoning, not just code quality.

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

## Reference

The full framework spec ships with the plugin at
[`reference/SCOPED_FRAMEWORK_V4.md`](./reference/SCOPED_FRAMEWORK_V4.md).

## License

MIT © Jonathon W. Marshall
