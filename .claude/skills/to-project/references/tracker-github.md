# Adapter: GitHub Issues

Use the `gh` CLI. If the `gh-axi` skill is installed, prefer it - it wraps the same
commands with better error handling.

Confirm the target repo before writing: `gh repo view --json nameWithOwner`. Publishing
into the wrong repo is easy and noisy to undo.

## Sequence

**1. Read the vocabulary.**

```bash
gh label list --limit 100
gh api repos/{owner}/{repo}/milestones --jq '.[].title'
```

Map the conventions file's labels to real ones. A label named there but missing here is
conventions drift - report it rather than inventing it. Creating labels is a workspace
change: ask first.

**2. Project container.** GitHub gives you two options, and they are not equivalent:

- **Milestone** - simple, repo-scoped, shows progress. Good default when the work lives
  in one repo.
- **Project (v2)** - board with custom fields, can span repos. Needed when the work
  crosses repos or the team tracks status on a board.

The conventions file should say which. If it does not, ask - do not pick, because
migrating between them later is manual.

```bash
gh api repos/{owner}/{repo}/milestones -f title="…" -f description="…"
gh project list --owner {owner}
```

**3. Issues, in dependency order.**

```bash
gh issue create --title "…" --body-file <path> --label "…" --label "…" --milestone "…"
```

Write the body to a file rather than inlining it - `--body` mangles multi-line markdown
and shell-quoting a Gherkin block is a losing game. Capture the returned issue URL and
number; later issues reference them.

Add to a v2 project with `gh project item-add <number> --owner {owner} --url <issue-url>`.

## Blocking edges

GitHub **does** have a native blocking relation - issue dependencies. Prefer it: it
renders in the tracker's own UI, so a reader sees what is takeable without opening
anything.

```bash
gh api repos/{owner}/{repo}/issues/{n}/dependencies/blocked_by   # what blocks this
gh api repos/{owner}/{repo}/issues/{n}/dependencies/blocking     # what this blocks
```

Probe it once before relying on it - availability varies by plan, and a repo that
predates the feature may have edges recorded only as prose. When it is unavailable,
fall back to a "Blocked by" section listing `#123` references, which render as live
links and show on the referenced issue's timeline.

Sub-issues are also native (`/issues/{n}/sub_issues`) and are the right way to express
parent/child breakdown - a map and its tickets. Do not use them for blocking; the two
relations are different and GitHub models both.

**Both conventions can coexist in one repo.** A pre-existing breakdown may record
blocking as prose while newer work uses native edges. That is not drift to reconcile
unless the conventions file says so - just do not assume one convention from seeing the
other.

## Wayfinding operations

How the `wayfinder` skill's map, tickets, claims and frontier are expressed on GitHub.
Skip this section unless you are running that skill.

**The map** is an issue labelled `wayfinder:map`. Its tickets are **native sub-issues**
of it, each carrying one `wayfinder:<type>` label (`research`, `prototype`, `grilling`,
`task`).

```bash
gh issue list --label "wayfinder:map" --state all --json number,title,url
gh api repos/{owner}/{repo}/issues/{map}/sub_issues --jq '[.[] | {number,title,state}]'
```

### Claiming

**Assignment is not a claim.** On a map with one human every ticket is assigned to the
same person, so assignment cannot distinguish a live session from a dead one, and it
collides with the human's own use of assignment for their own work. A claim is a
**label** plus a **comment**:

```bash
# 1. the marker - makes the frontier query cheap and shows in the GitHub UI
gh issue edit <n> --add-label "wayfinder:claimed"

# 2. the record - carries identity, time and mode, for staleness adjudication
gh issue comment <n> --body "$(cat <<'EOF'
<!-- wayfinder:claim
session: <short session id>
at: <ISO-8601 UTC>
mode: AFK | HITL
-->
Claimed. <One line on what is about to happen.>
EOF
)"
```

Create the label once, and say so - it is a workspace change:
`gh label create "wayfinder:claimed" --color D93F0B --description "A live wayfinder session holds this ticket"`

**Staleness.** An **AFK** claim (`research`, and `task` where the agent drives it alone)
is stale after **90 minutes** and the ticket returns to the frontier. A **HITL** claim
(`grilling`, `prototype`, and `task` handed to a human) **never expires on a timer** - a
conversation runs at human pace and idling is not dying. Release those by hand.

Taking over a stale claim is an act you record, not one you perform silently: comment
saying whose claim you are superseding and why, then re-claim. If a claim is present and
you cannot tell whether it is live, **it is live**.

**Dropping a claim** - on resolution, or on stopping without one:

```bash
gh issue edit <n> --remove-label "wayfinder:claimed"
```

### The frontier

Open, unblocked, unclaimed sub-issues of the map. The label makes the unclaimed half a
single query; blockers need the dependency API per candidate.

```bash
# unclaimed open tickets of a given type
gh issue list --state open --label "wayfinder:grilling" \
  --search "-label:wayfinder:claimed" --json number,title

# then, per candidate, unblocked means every blocker is closed
gh api repos/{owner}/{repo}/issues/<n>/dependencies/blocked_by \
  --jq 'map(select(.state=="open")) | length'   # 0 means takeable
```

Do not skip the blocker check because the list looked short. An open ticket with an open
blocker is not on the frontier, and it is the most common thing to get wrong.

### Before writing a resolution

Re-read the ticket. If it closed, or grew a resolution, while you were working, post a
reconciliation rather than a competing answer, and leave the recorded decision to the
human.

```bash
gh issue view <n> --json state,labels
gh api repos/{owner}/{repo}/issues/<n>/comments --jq '.[] | {user:.user.login, at:.created_at, len:(.body|length)}'
```

A resolution comment is usually long. Write it to a file and use `--body-file`; GitHub
caps a comment at 65536 characters, so split a long one into a short answer plus numbered
parts rather than truncating.

## Before you write

```bash
gh issue list --search "<key terms>" --state all --limit 30
```

Check for existing coverage. Never edit or close an issue this run did not create.

## Idempotency

If a run fails partway, list the milestone or project contents to see what landed,
report it, and continue from the first missing slice.
