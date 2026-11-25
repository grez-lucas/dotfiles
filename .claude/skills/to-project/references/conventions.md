# The conventions file

This is what makes `to-project` work on any tracker without carrying one team's
habits into another team's backlog. Everything house-specific - tracker, language,
issue template, labels, states, who may write - lives in one declarative file that
the skill reads at the start of every run.

The file is prose with headings, not a rigid schema. Read it the way a new teammate
would. What matters is that every section below has an answer.

## Where it lives

| Path | Use |
|---|---|
| `./.claude/pm-conventions.md` | Preferred. Versioned with the repo, so the whole team and every agent share one answer. |
| `~/.claude/pm-conventions.md` | Personal fallback for repos that do not have one, or for work outside any repo. |
| Wherever `CLAUDE.md` points | If the repo already documents its tracker conventions somewhere else, use that and do not create a second source. |

A repo-local file wins over the global one. If both exist and disagree, say so rather
than silently picking - a disagreement usually means the repo moved and nobody told
the global file.

## Bootstrap interview

When no file exists, ask these in a Lavish artifact (see "Grilling runs through
Lavish" in `SKILL.md`), one answer form per question, recommending an answer where the
repo already implies one. Questions that depend on an earlier answer (the template
depends on the tracker) go in a later round. Look up what you can before asking: the tracker is often visible
from the MCP tools available, the git remote, or existing issue references in commit
messages; the language is visible in existing issues; the template is visible by
fetching two or three recent issues from the tracker and reading how they are written.

Only ask what you genuinely cannot observe. Ten questions to a person who already
told you the answer in their repo is a bad trade.

1. Which tracker, and which workspace / team / repo inside it?
2. What language are issues written in?
3. Is there a project or epic container these issues hang under? How are they named?
4. What does a good issue in this team look like? (Ask for a link to one, or fetch a
   couple and propose the template you extracted.)
5. What labels are required on every issue, and what are the allowed values?
6. What state does a newly created issue start in?
7. Does the team size or estimate issues? On what scale?
8. Any house rules an agent must respect - who may write to the tracker, ADR
   requirements, criteria mirrored into test files, definition of ready?

Then write the file using `assets/pm-conventions.template.md`, show the diff, and get
approval before saving. Offer to commit it if it is repo-local - a conventions file
that only exists on one laptop helps one person.

## Sections the file must answer

**Tracker** - which one, and the identifiers needed to address it: workspace, team key,
project board, repo. Include the issue key prefix if there is one (`VUL-`, `GYM-`).

**Language** - the language of titles, descriptions, and criteria. State it explicitly
even when it is English; the point is that no run has to guess.

**Project container** - whether issues hang under a project, epic, or milestone; how
those are named; what fields they need.

**Issue template** - the actual markdown, verbatim, headings and all. This is the
highest-value section: it is what makes generated issues indistinguishable from
hand-written ones. If criteria have a required form - Gherkin, checklists, a
Given/When/Then dialect in another language - show it in the template with a real
example rather than describing it.

**Label taxonomy** - grouped, with which groups are mandatory. "Pick one type of work,
plus at least one priority label" is a rule an agent can follow. A flat list of forty
labels is not.

**States** - what a new issue starts in, and the transitions the team uses. Note which
transitions an agent may perform and which are human-only.

**Estimation** - whether issues carry estimates and on what scale, or explicitly that
they do not.

**House rules** - the constraints that outrank convenience. Common ones worth writing
down because they change what the skill does:

- Who may write to the tracker, and whether an agent may write at all.
- Whether acceptance criteria live in the tracker as the system of record, and whether
  they are mirrored elsewhere (`.feature` files, test names) with an issue tag.
- Whether architectural decisions require an ADR before an issue can be created.
- Whether a human must approve the breakdown before publishing (default: yes).
- Definition of ready - what an issue must contain before anyone may pick it up.

## Keeping it honest

Conventions drift. When a run notices reality disagreeing with the file - a label that
no longer exists, a template every recent issue has abandoned - say so and offer to
update the file. Do not quietly follow the file into producing issues that look dated,
and do not quietly follow reality while leaving the file wrong. Both leave the next
run guessing.
