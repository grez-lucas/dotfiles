# PM conventions

> How this team turns definitions into tracker issues. Read by the `to-project` skill
> and by anyone joining the team. Keep it true - a stale conventions file produces
> issues that look foreign.

## Tracker

- **Tracker:** <Linear | GitHub Issues | Jira | local files | …>
- **Workspace / org:** <…>
- **Team / repo / board:** <…>
- **Issue key prefix:** <e.g. `VUL-`, or "none">
- **Access route:** <MCP server name | CLI | API> — <anything a fresh session needs to know>

## Language

Issues are written in **<language>** - titles, descriptions, and acceptance criteria.

## Project container

- Issues hang under: <project | epic | milestone | nothing>
- Naming: <convention, with one real example>
- Required fields on a new project: <…>

## Issue template

Copy this verbatim into every issue body:

```markdown
<the actual template, headings and all>

<if acceptance criteria have a required form - Gherkin, checklists, a
Given/When/Then dialect in another language - show a filled-in example here rather
than describing it in prose>
```

## Labels

**<Group name> (pick exactly one):**
- `<label>` — <when it applies>

**<Group name> (one or more):**
- `<label>` — <when it applies>

**Mandatory:** <e.g. "one from Type of Work plus at least one from Priority & Impact">

## States

- A newly created issue starts in: **<state>**
- Transitions the team uses: <…>
- Transitions an agent may perform: <…, or "none - humans move issues">

## Estimation

<Scale and who estimates, or "the team does not estimate">

## House rules

- **Who may write to the tracker:** <…>
- **Acceptance criteria:** <where they are the system of record; whether they are
  mirrored elsewhere - `.feature` files, test names - and with what tag>
- **Architecture decisions:** <whether an ADR is required before an issue can be
  created, and where ADRs live>
- **Approval:** <who approves a breakdown before it is published — default: a human, always>
- **Definition of ready:** <what an issue must contain before anyone picks it up>
