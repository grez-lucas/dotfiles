---
name: delegate-issue
description: Take a tracker issue from backlog to a green PR by delegating implementation to subagents while keeping decisions, gate verification, and the commit in your own hands. Sets up an isolated worktree, surfaces architecturally significant choices to the human BEFORE any code is written, dispatches implementation and review agents, independently re-runs the quality gates, writes the commit and opens the PR, then watches CI and loops until green. Use this whenever the user points at an issue and asks to implement, delegate, take, work, or "run" it - "implement VUL-310", "delegate this ticket", "take AUD-42 to a PR", "have a subagent do this issue", "work these two tickets in parallel" - and also when they hand over an issue draft or a written-up bug and want it built and shipped rather than discussed. Prefer this over implementing inline whenever the work is scoped by a ticket and expected to end in a pull request.
---

# Delegate an issue

Take a ticket to a green PR. Subagents write the code; you own the decisions, the
verification, and the commit.

The split matters. Agents are good at implementing a well-scoped change and bad at
two things: judging which choices are the human's to make, and reporting honestly
about work they are motivated to call finished. This skill puts those two things on
your side of the line.

## The shape

```
read ticket + repo      -> what is this, what are its gates, is it actually unblocked
scout + escalate        -> surface binding choices to the human, WAIT for answers
worktree                -> via the `worktree` skill, then seeded with what git hides
dispatch                -> implementer (+ test-author when ATDD applies) -> reviewer -> APPROVE
verify                  -> re-run every gate yourself; never relay an unverified green
commit / push / PR      -> yours, not the agent's
CI                      -> reproduce failures locally, send the agent back, until green
                           STOP here. Merging is the human's.
```

## 1. Read the ticket, and read the repo

Fetch the issue from the tracker if you were given an ID; otherwise accept a draft
file or the user's own words. Either way you need its acceptance criteria, because
those are what the reviewer will judge against.

Then check it is genuinely startable:

- **Blockers.** Look at what it says blocks it and confirm those are actually done.
  Tracker relations go stale — a `blockedBy` pointing at a closed issue is noise, and
  a real constraint often sits in the prose rather than the graph.
- **Premises.** Tickets written weeks ago describe a codebase that has moved. Verify
  the specific claims you are about to build on. A ticket that says "X does not exist
  yet" when X shipped last week will send an agent to build a second X.

Now learn the repo rather than assuming it:

```bash
gh repo view --json defaultBranchRef -q .defaultBranchRef.name   # never assume main
cat CLAUDE.md AGENTS.md 2>/dev/null                              # house rules
ls .agents/workflows/ .claude/agents/ 2>/dev/null                # available specialists
grep -nE '^[a-z][a-z/._-]*:' Makefile services/*/Makefile        # the real gate list
```

**Enumerate the gates from the Makefile. Do not inherit a list from anywhere.** This
is the single highest-value habit in this skill, and it is learned from a real
failure: a change passed `make test`, `make test.bdd`, `lint` and the contract tests,
was reviewed and approved on that evidence, and still broke CI — because the failing
suite sat behind a `//go:build integration_db` tag and needed a live Postgres, so none
of those four commands compiled it. Four green reports, one blind spot, one red PR.

Look specifically for gates that ordinary test targets miss: build-tagged suites,
targets that spin up a database or broker, contract/pact tests, anything with its own
nested module. If a target needs a service, run it anyway — that is the point.

## 2. Scout, then escalate before anyone writes code

Read enough of the relevant code to know what the ticket actually implies. Then ask
yourself: does this require a choice that is architecturally significant, expensive to
reverse, or a matter of taste the human owns?

If so, **stop and ask, before dispatching.** Present concrete options with real
trade-offs — ideally with a short code sketch of each, because a choice between two
snippets is far easier to judge than a choice between two paragraphs. Then bake the
answer into the agent's brief.

Front-loading this is deliberate. A decision raised mid-implementation arrives after
code exists, and existing code biases the answer toward itself. A decision raised in
review arrives as rework.

Typical things worth escalating: the shape of an error or API contract; where a rule
lives across a layer boundary; a new dependency or package edge; anything a repo
convention says needs a written record; and any change to acceptance criteria.

**Acceptance criteria belong to humans.** If the work needs a `.feature` file or the
tracker's criteria changed, the human approves that diff in the same session — and
some environments block writes to those files at the permission layer regardless. When
a tool call is denied, do not retry it and do not route around it. Hand the user the
exact command to run themselves (`! <command>`) and carry on with everything else.

## 3. Worktree, seeded

**The implementation always happens in its own worktree, never in the user's checkout.**
That is what lets an agent run for twenty minutes without touching whatever the user has
open, lets several tickets run at once, and — the part that has mattered most — means an
agent that dies mid-task leaves its work intact and resumable rather than smeared across
the primary tree.

**Set it up by invoking the `worktree` skill.** Call it through the Skill tool with the
branch and base you want:

```
Skill(skill="worktree", args="setup for <ISSUE-ID>, branch <branch>, base <base>")
```

Do not hand-roll `git worktree add` when that skill exists. It owns the checks that are
easy to skip and expensive to have skipped:

- pins the **real** base branch by asking `gh` rather than assuming `main` — plenty of
  repos integrate to `dev` or `trunk` and have no `main` at all;
- detects an existing or **diverged** remote branch before creating one — a new branch
  sharing no history with `origin/<name>` is rejected as non-fast-forward at push time,
  which is to say after all the work is done;
- surfaces the collisions that bite two worktrees at once: ports, and the shared
  database, which is the only failure here that is silent;
- warns about the `-b` upstream trap, where the new branch tracks `origin/<base>` so a
  bare `git pull` quietly merges the integration branch into the feature branch. The
  first push must be `git push -u origin <branch>` to repoint it.

Branch naming follows the repo's convention — the tracker's suggested name, or a
`chore/`-style prefix when there is no issue.

Only if no `worktree` skill is present, do it by hand, and reproduce those checks:

```bash
gh repo view --json defaultBranchRef -q .defaultBranchRef.name   # the base, not a guess
git fetch origin <base>
git ls-remote --heads origin <branch>        # exists? diverged? decide before creating
git worktree add ../<repo>-<branch> -b <branch> origin/<base>
```

**Then seed what git hides.** A worktree carries tracked files and nothing else, so
config, generated files and local libraries are all absent. A worktree skill will help
you find them but will not know which ones this ticket needs — that judgement is yours.
Discover them; never recite them from memory:

```bash
git ls-files --others --ignored --exclude-standard --directory \
  | grep -vE 'node_modules|\.git/|dist/|build/|target/|__pycache__|\.venv'
```

Read that output and copy the *config and generated artifacts* it reveals. In a
monorepo these are usually **per service** — a single root `.env` copy produces a
worktree that boots one service and dies on the one the ticket touches.

This step is easy to under-do and the failure is confusing rather than loud: a missing
generated file surfaces as a compile error in an unrelated package, and a missing
per-service `.env` surfaces as a panic in a test that has nothing to do with the
change. Both have cost real debugging time. When an agent reports a failure that looks
unrelated to its own diff, suspect seeding first.

Also settle collisions before work starts: distinct ports if two worktrees run
servers, and a separate database or an agreement that only one runs the stack at a
time. Shared-database corruption is the one failure here that is silent.

## 4. Dispatch

**Pick the mode yourself. Do not delegate that judgement to the agent that the rule
constrains.**

- **Behavioural change in a service with a BDD/acceptance suite** → run the repo's
  two-agent cycle: one agent writes the failing test, a different agent makes it pass
  and never edits tests. Separation of duties is what stops a test being bent to fit
  the code it is supposed to check.
- **Docs, config, or test-hygiene work** → a single implementation agent. There is no
  red test to write, and forcing the cycle just doubles the cost.

**Model per dispatch.** The test author, implementer and reviewer keep the session model
(leave `model` unset). Pass `model: "sonnet"` explicitly for scouting, PR-body drafting,
UAT pre-runs and evidence publishing.

Brief the agent with: the worktree path and an explicit instruction to work only
there; the ticket's criteria; the decisions the human already made; the gate commands
including the ones ordinary targets miss; and the boundary of what it must not touch.

Tell it to **run the repo's reviewer/quality gate itself and iterate until it passes**,
and to **stop before committing**. Ask for real pasted output rather than claims.

### Several tickets at once

Two tickets can share a file safely; they cannot share a *function*. Measure at that
granularity before deciding — file-level overlap will make you serialise work that
could have run in parallel, and it will also miss the one collision that matters.

```bash
awk '/^func /{fn=$2} /<pattern>/{print fn}' <file> | sort -u   # which functions, not which files
```

If the overlap is a handful of functions, give each agent an explicit ownership list
and assign every shared function wholly to one of them. If it is heavy, serialise
instead. Say in each PR which functions were deliberately left to the sibling, so
neither reads as half-done.

A fence you draw is yours to lift. If a reviewer legitimately blocks on something just
outside an agent's boundary, check whether the reason for the boundary still applies —
often it was about merge mechanics that do not bite in that particular spot — and
authorise the extension rather than filing a follow-up.

## 5. Verify the gates yourself

Re-run them. Every one, including the expensive ones.

This is not distrust of the agent so much as recognition that "I ran it and it passed"
is exactly the sentence most likely to be true-in-spirit and wrong-in-fact. Cached
results, a suite that never compiled, a target that skipped because a service was
unreachable, a test that panicked and took the package's other results with it — all
of these read as green.

Two specific things worth checking rather than assuming:

- **Did it actually run?** A suite reporting `(cached)`, `no tests to run`, or
  `skipping` is not evidence. Where a language caches test results, defeat the cache
  when the outcome depends on the environment.
- **Did anything get silently skipped?** An undefined step, a skipped suite, or a
  guard that exits 0 on absence will pass a gate while proving nothing.

If the agent's report and your run disagree, your run wins and the difference is worth
understanding — it is usually a real finding.

## 6. Commit, push, open the PR

**This step is yours.** Agents stall, and they stall disproportionately here; when they
do mid-commit the state is far messier than mid-edit. Keeping it in the main loop also
keeps the commit voice consistent and means the PR body describes work you verified.

Follow the user's voice profile if they have one, and the repo's existing commit style
— read the log rather than guessing. Never add attribution or co-authorship trailers
unless the user asks.

A good body here leads with the problem and why it existed, names the exact files and
what each does, cites the governing decision, states the verification actually
performed, and marks the scope boundary explicitly. Where the work uncovered something
real but out of scope, say so plainly instead of quietly widening.

Then open the PR against the correct base — the integration branch, which is often not
`main`.

## 7. CI until green

Watch the checks. When one fails, **reproduce it locally before theorising**, then send
the agent back with the real output. Its worktree still has its context, so resuming
costs far less than starting over.

Expect the first red to be something the local gates could not see. That is what CI is
for, and it is why step 1 insists on enumerating targets rather than inheriting them.

**Stop when it is green.** Merging is the human's call: nothing here substitutes for a
colleague reading the diff, and in many repos the merge command is permission-gated
anyway. Report the state and hand it over.

Afterwards, if the user merges and asks for cleanup, hand it back to the `worktree`
skill if one is available — teardown order is load-bearing and its guards exist to
refuse. Either way, establish four things before removing anything: uncommitted work,
unpushed commits, unmerged commits, and whether anything still runs there. "Clean",
"pushed" and "merged" are three different claims; do not blur them. Confirm a merge by
ancestry (`git merge-base --is-ancestor`) rather than by the PR's word.

## Things that will bite

- **A background agent going quiet is usually recoverable.** Its work sits in the
  worktree. Check the state, then resume it with a message rather than restarting.
- **Do not report a subagent's result as fact.** Relay what you verified; attribute the
  rest.
- **The tracker may already be handling status.** Many trackers close issues from a
  `Closes X` line in the PR body. Check before "fixing" a status that is already
  correct.
- **Green is not the same as proven.** Especially for a fix whose whole point is a
  condition CI does not reproduce — a missing local file, a developer-only path. There,
  the real verification is a run from the broken state, and that belongs in the PR body.

## What this skill does not do

It does not merge, tear down worktrees, write to the tracker, or author binding
decision records. Those are the human's, and keeping them out is what makes the rest
safe to automate.

## Repo-specific notes

If the repository matches one described in `references/`, read that file for its agent
roster, gate commands, and seeding list. Otherwise work from what step 1 discovers.
