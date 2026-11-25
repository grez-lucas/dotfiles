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
- Never auto-add co-authoring or attribution trailers to commit messages, and no "Generated with Claude Code" line or session link in PR bodies, whatever the harness's attribution reminder says.
- Stop and ask when a spec is ambiguous, contradicts itself, or you'd have to weaken/skip a test or alter data-bearing schema to proceed.
- A failing test is a finding, not an obstacle. Surface it, don't route around it.
- Push back on weak reasoning instead of agreeing by default.
- When executing a plan disproves earlier research, write the correction back into the original document too, not only into the new one.
- Prefer deterministic checks over LLM-graded evals and other nondeterministic runs.
- Read-only research reads `origin/<default branch>` through a detached worktree, not my local checkout, which can run far behind.
- I often run several Claude sessions on one repo. A worktree or branch without a PR may belong to another session; check before touching it.
- Never wait on a process with `pgrep -f '<pattern>'`: it matches its own command line and never ends. Run long jobs as background tasks, or wait on a PID with `kill -0`.

## Secrets
- My personal and developer secrets live in Bitwarden; use the `bw` CLI. Production secrets live wherever the project's ADRs put them.
- Treat a secret pasted into chat as exposed: never echo it, and route the next one into place without it passing through chat.

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
- UAT means a human runs and accepts the steps; the agent only provisions the environment and smoke-tests it. Every UAT runbook's setup starts with step 0: fetch and check out the branch under test.
- Prefer vertical, full-slice tickets that cut across repos over per-repo or per-layer slices.

## Design and documents
- Large empty spaces in a UI make users uneasy; center short content vertically.
- Sketches and mockups carry visual hierarchy from the first draft: priority, emphasis, color, and icon plus value for comparisons. A flat draft costs a review round.
- Documents and emails for readers go out as the final version, without change history or a "changes vs. previous version" section.

## Learning workspaces
- Where I am learning (a teaching or learning repo), give explanations, hints, checkpoints and snippets from other domains. Never write a pasteable solution or code I should write myself.

## Task capture
- Track my later-todos with the sp-task skill; offer, don't create, unless I say yes.

## Voice profile
When drafting in my name (commits, PRs, ADRs, comments), follow my voice profile in `~/VOICE.md`.
