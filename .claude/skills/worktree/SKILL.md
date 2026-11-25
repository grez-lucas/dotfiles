---
name: worktree
description: Set up, hand off, and tear down git worktrees so several agents or tasks run in parallel on one repo without colliding. Use when the user wants to work on two branches at once, run a second agent on another ticket, isolate a task from in-flight work, or clean up worktrees and branches afterwards.
---

# Worktree orchestration

One repo, several working directories, one branch each, shared object store. Use it when a
second task must run without disturbing the first: another agent on another ticket, a long
build, a review of someone else's branch, or two approaches compared side by side.

**The one thing to internalise:** a worktree isolates *tracked files and the branch*.
Secrets, dependencies, ports, and databases are not isolated, and each of those fails at a
different moment. Three fail loudly on first run. The database fails silently, which makes
it the dangerous one.

| Not carried over | Fails when | Handling |
| --- | --- | --- |
| Ignored files (`.env`, per-service config, local settings) | first run or test, service won't boot | copy explicitly (step 3) |
| Dependency dirs (`node_modules`, `.venv`, `vendor`) | first build | reinstall, or symlink |
| Ports | second dev server starts | distinct port per worktree |
| **Database / shared services** | second migration, **silently** | separate DB, or serialize; see step 5 |

Language-level caches (Go module cache, Yarn/npm global cache, pip cache) are genuinely
global and need nothing.

## Governing principle: discover, never recite

Every list in this skill is produced by a command, not memorised. Repos change; a
hardcoded list of env files or services goes stale and fails silently, skipping the thing
it was meant to cover. If you catch yourself typing a path from memory, run the discovery
command instead.

---

## Setup

### 1. Pin the base branch — do not assume `main`

```bash
gh repo view --json defaultBranchRef -q .defaultBranchRef.name    # dev, main, master, trunk…
git fetch origin <base>
git rev-parse origin/<base>                                       # must resolve
```

Assuming `main` is the single most common failure here, and it surfaces at PR time, long
after the work is done. Some repos integrate to `dev`, `develop`, or `trunk` and have no
`main` ref at all. Ask `gh`, and let a caller-supplied base override it.

### 2. Check the branch name is free — and not diverged

```bash
git branch -a --list '*<name>*'          # local + remote-tracking
git ls-remote --heads origin <name>      # authoritative remote state
gh pr list --head <name> --state all --json number,state,title
```

Three cases, three different actions:

- **Nothing exists** → clean slate, proceed.
- **A remote branch exists** → decide *before* creating: continue that work
  (`git worktree add <path> <name>`, no `-b`) or start fresh under a different name. A new
  branch that shares no history with an existing `origin/<name>` will be **rejected as
  non-fast-forward at push time**, after the work is done.
- **Local and remote both exist and have diverged** → stop and show the user both sides.
  Two implementations of one ticket means someone (or some agent) built it twice; deleting
  either without reading both discards work that exists nowhere else.

```bash
git log --oneline --left-right <name>...origin/<name>    # '<' local only, '>' remote only
```

### 3. Create the worktree

```bash
git worktree add <path> -b <branch> origin/<base>     # new branch
git worktree add <path> <branch>                      # existing branch, no -b
```

Put it beside the repo (`../<repo>-<branch>`) so paths stay short and it is obvious in
`ls`. Git refuses to check out one branch in two worktrees — that constraint is the
guarantee the whole pattern rests on, not an obstacle.

### 4. Seed what git hides

Ask the repo what it is ignoring rather than guessing:

```bash
git ls-files --others --ignored --exclude-standard --directory \
  | grep -vE 'node_modules|\.git/|dist/|build/|target/|__pycache__|\.venv'
```

Read the output and copy the *config* it reveals — `.env` files at every level, local
settings, generated config. In a monorepo these are **per service**, so a single root
`cp .env` yields a worktree that boots one service and dies on the one actually needed.

```bash
SRC=<primary-worktree>; DST=<new-worktree>
for f in <the files discovered above>; do
  mkdir -p "$DST/$(dirname "$f")" && cp "$SRC/$f" "$DST/$f" && echo "copied  $f"
done
```

Then install dependencies only for the stack the task touches — frontend work needs its
`node_modules`; work in a language with a global module cache needs nothing.

### 5. Resolve collisions before the agent starts

- **Ports** — assign a distinct port per worktree if both will run a dev server.
- **Database** — if both worktrees run migrations against the same instance, they corrupt
  each other's schema, and the tests still pass. Either give the new worktree its own
  database (distinct compose project name / DB name / port) or agree that only one session
  runs the stack at a time. If neither is possible, **say so explicitly** rather than
  letting the user discover it through a confusing failure.
- **Shared external services** — same reasoning for a message broker, cache, or object
  store with fixed queue/bucket names.

### 6. Verify and hand off

```bash
git -C <new-worktree> status --short --branch
git worktree list
```

Then tell the user how to start work there, in a **separate terminal** so the two sessions
never share a cwd:

```
! cd <new-worktree> && claude
```

Always flag the upstream gotcha in the handoff — see below.

---

## The `-b` upstream trap

`git worktree add -b <branch> <path> origin/<base>` sets the new branch's upstream to
**`origin/<base>`**, not to its own future remote branch. A bare `git pull` in that
worktree then merges the integration branch into the feature branch — a silent, surprising
merge commit.

Make the first push explicit; it repoints the upstream correctly:

```bash
git push -u origin <branch>
```

---

## Teardown

Run from the **primary** worktree — you cannot remove one you are standing in. The order
is load-bearing, and each step is its own safety check.

```bash
# 1. Land the work first. Nothing below is safe until the commits are on the base branch.
gh pr merge --delete-branch          # or confirm the merge some other way

# 2. Confirm it really landed — do not take the PR's word for it.
git fetch origin <base>
git merge-base --is-ancestor <branch> origin/<base> && echo MERGED || echo NOT-MERGED

# 3. Remove the worktree. Refuses if dirty — that refusal is the point.
git worktree remove <path>

# 4. Delete the branch. Must follow (3): git won't delete a checked-out branch.
git branch -d <branch>               # lowercase -d refuses if unmerged: last safety net

# 5. Bookkeeping.
git fetch --prune                    # drop stale remote-tracking refs
git worktree prune                   # clear metadata for dirs deleted by hand
```

Read what the guards say instead of reaching for the force flag. `git worktree remove`
refusing means uncommitted work; `git branch -d` refusing means unmerged commits. `--force`
and `-D` skip exactly the check that was about to save you.

`git branch -d` compares against the branch's **upstream**, not the integration branch, so
it can succeed on work that never reached `dev`/`main`. It prints a warning when that
happens — read it:

```
warning: deleting branch 'X' that has been merged to
         'refs/remotes/origin/X', but not yet merged to HEAD
```

That case is safe (the commits survive on the remote) but it is *not* "merged". Say which
one it was.

### Before deleting anything, establish these

1. **Uncommitted work?** `git -C <path> status --porcelain` — empty or not.
2. **Unpushed commits?** compare `git rev-parse HEAD` against `git ls-remote --heads origin <branch>`.
3. **Unmerged commits?** `git merge-base --is-ancestor <branch> origin/<base>`.
4. **Still in use?** a live process with that cwd, or an agent session still running.

Report which of these held. "Removed, and the commits are safe on `origin/<branch>`" is a
different statement from "removed, it was merged" — do not blur them.

### Deleting remote branches

Never delete a remote branch as part of routine cleanup. It is shared state, it may back
someone else's checkout, and the local cleanup above is already complete without it. Offer
the command and let the user run it:

```
! git push origin --delete <branch>
```

---

## Worked example

Second agent on `VUL-240`, primary session busy on another ticket, Go + Vue monorepo
integrating to `dev`:

```bash
gh repo view --json defaultBranchRef -q .defaultBranchRef.name     # dev  (no main exists)
git ls-remote --heads origin vul-240                               # empty: clean slate
git fetch origin dev
git worktree add ../platform-vul-240 -b vul-240 origin/dev

git ls-files --others --ignored --exclude-standard --directory | grep -vE 'node_modules|\.git/'
#   .env
#   .env.test
#   services/auth-service/.env        <- per service: a root-only copy would miss these
#   services/notification/.env
#   web-ui/public/config.js

# copy those five, preserving paths, then:
git -C ../platform-vul-240 status --short --branch                 # clean, on vul-240
```

Handoff: *"Start it with `! cd ../platform-vul-240 && claude`. Two things: the branch
tracks `origin/dev` because of `-b`, so the first push should be `git push -u origin
vul-240`; and `node_modules` didn't come along, so run `yarn install` there if the ticket
touches `web-ui`. Both worktrees share one Postgres — sort out DB separation before either
runs migrations."*

---

## When not to use a worktree

- **The two tasks touch the same files.** Isolation prevents collision on disk, not
  conflict at merge. Partition the work first; if you can't, do it sequentially.
- **A bounded, self-contained task** — a background agent with `isolation: "worktree"`
  creates and cleans one up automatically. Prefer that over a hand-managed directory for
  anything you don't intend to babysit.
- **More than ~3 parallel worktrees.** The per-worktree setup stops scaling; reach for a
  dedicated orchestrator (`workmux`, `gwq`, `uzi`) that handles ports, env copying, and
  teardown.
- **You need real isolation.** Worktrees are a filesystem boundary, not a security one.
  Every worktree reaches the same network, the same services, and the same secrets. That
  needs containers.

## Hard rules

| Rule | Why |
| --- | --- |
| Never assume the base branch is `main` | Ask `gh`; many repos integrate to `dev`/`trunk` and have no `main` at all |
| Check for an existing/diverged remote branch before creating one | A non-fast-forward rejection at push time comes after the work is done |
| Never `cp` env files from a remembered list | Run the discovery command; a stale list fails silently |
| Never delete a branch or worktree without establishing the four facts above | "Clean" and "merged" and "pushed" are three different claims |
| Prefer `git worktree remove` over `rm -rf`, `-d` over `-D` | The safe forms refuse; refusing is the feature |
| Never delete a remote branch as routine cleanup | Shared state — hand the user the command |
| Surface the shared-database problem before parallel work starts | It is the only failure mode here that is silent |
