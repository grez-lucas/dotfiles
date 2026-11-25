---
name: to-project
description: Turn a sharpened definition - a grilled plan, spec, PRD, ADR, or the current conversation - into a real project on an issue tracker - a project/epic plus tracer-bullet issues carrying acceptance criteria, labels, and blocking edges. Tracker-agnostic - reads a per-project conventions file to learn the tracker, language, issue template, and label taxonomy, and bootstraps that file by interview when it is missing. Use this whenever the user wants to bajar a plan into Linear, Jira, or GitHub Issues, break work into tickets under a project or epic, turn a grilling session into issues, or asks to "pasa esto a Linear", "crea los issues", "arma el proyecto", "break this into tickets", "make an epic out of this spec". Also use when the user names any issue tracker together with a plan they want executed.
---

# To Project

Take a definition of what you want to build and land it on the issue tracker as a
**project**: one container (project / epic / milestone) plus a set of
**tracer-bullet issues** that a person or an agent can pick up cold.

The value is not the typing. It is the four things that make a project executable:

1. The definition is **sharp enough to slice** before you slice it.
2. Every slice is a **thin vertical path through all layers** - demoable on its own.
3. Every slice declares **what blocks it**, so the frontier is always visible.
4. The issues speak the **house dialect** - right language, right template, right
   labels - so they are indistinguishable from ones a human wrote.

You draft. **The human owns the acceptance criteria** and approves before anything
is published. That is not ceremony: criteria are the contract with the business,
and a contract you invented on their behalf is not a contract.

---

## Grilling runs through Lavish

Every time this skill puts decisions to the human, it does it in a **Lavish artifact**,
never as a wall of chat text. That covers:

- the conventions **bootstrap interview** (Step 0),
- **duplicate/overlap** and **architecture option** questions (Step 2),
- the **project shape** (Step 3),
- the **breakdown quiz** and the **sample issue body** approval (Step 5).

Load the `lavish` skill first and open the `input` playbook (plus `comparison` for
architecture options, `diagram` for blocking edges, `table` for the breakdown) before
writing HTML. Then:

1. Work in **rounds**, as `grilling` does: the frontier is every question whose
   prerequisites are settled. Put the whole frontier in one artifact, numbered, each
   with **your recommendation** and an **answer form** - so the human accepts or
   rejects a default instead of facing a blank page.
2. Write it to `.lavish/to-project-<slug>-r<N>.html` in the working directory, open it
   with `npx -y lavish-axi <file>`, and run `npx -y lavish-axi poll <file>` as a
   background task. Never kill the poll; if it dies, re-run it.
3. Apply the answers, recompute the frontier, update the same artifact for the next
   round and reply with `poll --agent-reply "<what changed>"`. A question the human
   left blank stays open - never infer it from a neighbour's answer.
4. When the frontier is empty, run `npx -y lavish-axi end <file>` and recap the
   settled decisions in chat before moving to the next step.

Facts you can look up stay out of the artifact - only decisions go in. Write the
artifact in the conventions file's language, and in plain product language when the
audience is not engineering. Chat fallback only if `lavish-axi` cannot start; say so.

---

## Step 0 - Load the conventions

Everything tracker-specific and house-specific lives in a **conventions file**, not
in this skill. Find it in this order:

1. `./.claude/pm-conventions.md` in the repo (preferred - versioned, the team shares it)
2. `~/.claude/pm-conventions.md` (personal fallback)
3. A path the repo's `CLAUDE.md` points to

Read it and also read the repo's `CLAUDE.md` - house rules about who may write to the
tracker, ADR requirements, or `.feature` mirroring usually live there and override
anything generic in here.

**No conventions file?** Do not guess the template and labels - those are exactly the
things that cannot be inferred and that make issues look foreign. Read
`references/conventions.md` and run the short bootstrap interview (in Lavish - see
above), then write the
file with the user's approval. It is a one-time cost that pays back on every run.

Once you know the tracker, read the matching adapter and nothing else:

| Tracker | Read |
|---|---|
| Linear | `references/tracker-linear.md` |
| GitHub Issues | `references/tracker-github.md` |
| Local files | `references/tracker-local.md` |
| Anything else (Jira, Azure DevOps, Shortcut, …) | `references/tracker-generic.md` |

---

## Step 1 - Gate the context

A plan that has not been stress-tested produces issues that look tidy and are wrong.
Publishing thirty of those is worse than publishing none, because now the wrongness
is spread across a backlog and looks official.

So before slicing anything, check the definition against these signals:

- The **outcome** is a change in the world ("los usuarios pueden X"), not a list of
  tasks ("crear tabla, crear endpoint").
- Every decision that would **change the shape of the work** has an answer - or is
  explicitly deferred, with who decides and when.
- You can name what is **out of scope**.
- You can say **how you would know it worked**.
- The **constraints** are known: deadlines, other teams, data or migration risk.
- No slice would require an **architectural decision that is not yet recorded**.

Count the misses. Zero or one: proceed, and name the gap out loud so it stays visible.
Two or more: **stop and say so**. Recommend the right sharpening tool and hand back:

- `/grill-me` - the plan exists but the decisions inside it are soft.
- `/grill-with-docs` - the work introduces new domain vocabulary, or needs ADRs and a
  glossary as a by-product.
- `/to-spec` or `/to-prd` - there is an idea but no written definition yet.

Whichever you recommend, say the grilling should run through Lavish so the answers
land as recorded decisions this skill can slice from.

Say plainly which signals are missing and why they matter for slicing. Do not offer
to "start anyway with assumptions" - assumptions published as acceptance criteria are
the exact failure this gate exists to prevent.

---

## Step 2 - Ground the work in reality

Facts you can look up are yours to find. Decisions are the user's.

- Read the codebase in the area you are touching. Use its **ubiquitous language** -
  titles and criteria should read like the domain, not like the implementation.
- Read the relevant **ADRs and glossary**. Accepted ADRs are binding: a slice that
  contradicts one is a finding, not a design choice.
- Search the tracker for **issues that already cover this**. Duplicates are expensive
  to unwind. If you find overlap, surface it and ask whether to extend, supersede,
  or skip - never silently create a twin, never edit or close someone else's issue.
- Look for **prefactoring** opportunities: "make the change easy, then make the easy
  change". Prefactoring becomes its own first slice.

**If a slice would require an architecturally significant decision that no ADR
covers** - a new dependency, a datastore or messaging choice, an API contract shape,
a change to layering, anything expensive to reverse - stop. Present the concrete
options with their trade-offs in a Lavish comparison and let the human choose. Do not pick one and encode
it into an issue; an issue is a decision that looks like a task.

---

## Step 3 - Shape the project

Before the issues, agree on the container. Draft and confirm (in Lavish):

- **Name** - short, in the house language, naming the outcome.
- **Outcome** - what is true when this project is done that is not true today.
- **Out of scope** - the boundary, stated once here so you do not relitigate it per issue.
- **Success measure** - how you will know.
- **Milestones** (if the tracker has them) - each one a **demoable increment**, not a
  phase of the build. "Escaneo end-to-end para un dominio" is a milestone. "Backend"
  is not - nobody can demo a layer.

---

## Step 4 - Slice into tracer bullets

Each issue is a **thin vertical slice that cuts through every layer end to end** -
schema, API, UI, tests - not a horizontal slice of one layer. Horizontal slices are
seductive because they are easy to name and impossible to demo; three of them have to
land before anything works, and the integration risk stays hidden until the last one.

Rules:

- A finished slice is **demoable or verifiable on its own**.
- Each slice fits in **one fresh context window** - if an agent cannot hold it, split it.
- **Prefactoring goes first**, as its own slice.
- Every slice declares its **blocking edges**: which slices must finish before it can
  start. No blockers means it can start immediately.
- Criteria are **behaviour and data**, never call counts or file paths. Paths go stale;
  behaviour does not.

**Wide refactors are the exception.** A mechanical change whose blast radius fans
across the codebase - rename a column, retype a shared symbol - cannot land green as a
tracer bullet. Sequence it **expand - migrate - contract** instead: add the new form
beside the old, migrate call sites in batches sized by blast radius (each batch its
own slice, blocked by the expand, green the whole way because the old form still
exists), then delete the old form in a final slice blocked by every batch.

`references/slicing.md` has the sizing heuristics, the anti-patterns, and how to
handle spikes and slices that cross repos.

---

## Step 5 - Quiz the user, then get approval

Present the breakdown in a Lavish artifact - a numbered table of slices plus a
diagram of the blocking edges. Per slice:

- **Title** in the house language
- **Delivers** - the end-to-end behaviour this makes work, from the user's side
- **Blocked by** - numbers of the slices that gate it
- **Labels** - proposed, from the taxonomy in the conventions file
- **Milestone** - if the tracker has them

Then ask, as answer forms in the artifact, and actually wait on the poll:

- Is the granularity right - too coarse, too fine?
- Are the blocking edges real, or just the order you happened to think of them in?
- Should any be merged or split?
- Anything missing that the definition implied but nobody wrote down?

Iterate until the user approves. Then **render one full issue body** - the first
slice, with the house template applied - and add it to the same artifact before
publishing anything. It is
much cheaper to fix a template mistake once than across thirty issues.

Publish only on an explicit go-ahead.

---

## Step 6 - Publish

Follow the adapter you read in Step 0. The shape is the same everywhere:

1. Create or attach the **project / epic**.
2. Create the **milestones**, if any.
3. Create the **issues in dependency order** - blockers first, so later issues can
   reference real identifiers instead of placeholders.
4. Record the **blocking edges** using the tracker's native relation if it has one;
   otherwise as a "Blocked by" section naming real identifiers.
5. Apply the **labels** the taxonomy requires.
6. Set the **initial state** the conventions file specifies.

If something fails mid-run, stop and report what did and did not get created. A
half-published project that you silently continue past is a backlog nobody can trust.

---

## Step 7 - Hand off

Report back:

- The project link, and a table of issue identifiers to titles.
- The **frontier**: which issues have no open blockers and can start now.
- Anything you deliberately left out, and why.
- Any follow-up the house rules require - an ADR to write, criteria to mirror into
  `.feature` files with their issue tag, a conventions-file update.

Then point at the next step in the loop: work the frontier one issue at a time with a
fresh context - `/implement`, `/gymly-ticket-branch`, or whatever the repo uses.

---

## What never happens here

- Publishing acceptance criteria the human has not approved.
- Inventing a criterion to fill a gap in the definition. A gap is a finding - surface it.
- Deciding architecture. Options and trade-offs go to the human; ADRs are theirs to accept.
- Editing or closing an existing issue that this run did not create.
- Moving an issue's status. Creation is this skill's concern; the status flow belongs to
  whatever the repo uses to sync it from repo events. Two agents writing status is how a
  board starts lying.
- Weakening a slice so it fits a size you already promised.
