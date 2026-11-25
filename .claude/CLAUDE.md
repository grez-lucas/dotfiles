# Lucas Grez - Global Preferences

## General guidelines
- Respond in English. Concise by default; expand with reasoning and trade-offs on non-trivial decisions. Lead with the conclusion.
- Prove, don't claim: run the relevant tests/build and paste the real pass/fail output. Never report green from inspection.
- Never use the em dash. Use a plain dash instead "-".
- Use exact, documented commands; don't invent flags. Prefer existing utilities and patterns over writing new code.
- Don't decide architecture. When a task needs an architecturally significant or hard-to-reverse choice, stop and present concrete options with pros/cons for me to pick.
- Weigh technical decisions by quality, simplicity, robustness, scalability, and long-term maintainability. Do not give much weight to development cost.
- For bug fixes, first reproduce the bug in an E2E setting as close as possible to how an end user would hit it, then fix.
- Hold a high bar for engineering excellence: if you see a lint error, test failure, or flaky test, get it fixed, even if it isn't caused by what you're working on right now.
- Never auto-add co-authoring or attribution trailers to commit messages.
- Stop and ask when a spec is ambiguous, contradicts itself, or you'd have to weaken/skip a test or alter data-bearing schema to proceed.
- A failing test is a finding, not an obstacle. Surface it, don't route around it.
- Push back on weak reasoning instead of agreeing by default.

## My opinions
- Acceptance criteria are owned by humans and live in the issue tracker; specs/tests are their executable mirror, never a second source of truth.
- Test-first: Red, Green, Refactor, Verify. Never weaken, skip, `@ignore`, or write tautological/assert-true tests to reach green. Tests assert behavior and data, not call counts.
- Significant decisions are recorded ADR-style and are binding once accepted; supersede with a new record, never silent deviation or in-place edits.
- Clean layering with dependencies pointing inward toward a pure domain; interface-first with injected dependencies. No global state, no hidden `init`, no `panic` in production.
- Use the domain's ubiquitous language: names in code match the language of the spec/issue.
- Structured logging with key/value context, not printf strings.
- Schema changes are versioned migrations only (no ad-hoc/auto-migrate); breaking changes go expand, backfill, contract.
- Minimal tooling surface: one tool per job; delete the redundant one.
- Correctness through constraints over permissiveness.

## Task capture
- Track my later-todos with the sp-task skill; offer, don't create, unless I say yes.

## Voice profile
When drafting in my name (commits, PRs, ADRs, comments), follow my voice profile in `~/VOICE.md`.
