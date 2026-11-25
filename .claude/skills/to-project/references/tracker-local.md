# Adapter: local files

No tracker, or a tracker you cannot reach from here. The issues still need to exist as
independently grabbable units, so write **one file per issue** - never a single
combined document. The whole point is that an executor can open exactly one of them
with a fresh context and have everything needed.

## Layout

```
.scratch/<project-slug>/
├── README.md              the project: outcome, out of scope, success measure, index
└── issues/
    ├── 01-<slug>.md
    ├── 02-<slug>.md
    └── …
```

Number from `01` in **dependency order** - blockers first - so the numbering itself
carries the topology and the reading order is the working order.

Check whether the repo already has a convention for scratch or planning directories
before creating `.scratch/`, and whether it is gitignored. If these files are meant to
be shared, they belong somewhere versioned - ask.

## Project README

```markdown
# <Project name>

**Outcome:** what is true when this is done that is not true today.

**Out of scope:** the boundary.

**Success measure:** how we know it worked.

## Issues

| # | Title | Blocked by | Status |
|---|---|---|---|
| 01 | … | none | ready |
| 02 | … | 01 | blocked |
```

The table is the frontier view a tracker would have given you. Keep it in sync when
issues are added or renumbered - a stale index is worse than none, because people trust
it.

## Issue file

Use the issue template from the conventions file - same headings, same language, same
criteria form. The tracker being a filesystem does not change the house dialect. Add
these two lines, which a real tracker would have carried as fields:

```markdown
**Blocked by:** 01, 03 — or "none, can start immediately"
**Status:** ready | blocked | in progress | done
```

## Promoting to a real tracker later

Local files are usually a staging step. Keep them promotable: real titles, real
criteria, blocking edges by number. When the tracker appears, re-run the skill with the
files as input - the slicing is already approved, so it goes straight to publishing.
