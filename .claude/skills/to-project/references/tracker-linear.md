# Adapter: Linear

Linear is reached through its MCP tools. **Do not call them from memory** - the tool
schemas are deferred, and parameter names differ between versions. Load the schemas
first, read the parameter list, then call:

```
ToolSearch("select:list_teams,list_projects,save_project,save_issue,list_issue_labels,list_milestones,save_milestone,list_issue_statuses,list_issues,get_issue")
```

Tool names are prefixed by the server (`mcp__claude_ai_Linear__…` or
`mcp__linear-server__…`). Match whichever is connected. If none is, say so and offer
the local-files adapter instead of half-publishing.

## Sequence

**1. Resolve the team.** `list_teams`, then match the team key from the conventions
file. The team id gates everything else.

**2. Read the vocabulary before writing anything.** `list_issue_labels` and
`list_issue_statuses` for that team. Map the label names in the conventions file to
real ids and confirm the initial state exists. A label named in the conventions file
but missing from the workspace is a conventions drift - report it, do not invent the
label and do not silently drop it.

**3. Project.** `list_projects` to check whether the target already exists. If it does,
confirm with the user before attaching to it. If not, `save_project` with name,
description, and the team. Project descriptions carry the outcome, the out-of-scope
boundary, and the success measure agreed in Step 3 of the skill.

**4. Milestones.** `list_milestones` on the project, then `save_milestone` for each
demoable increment, in order.

**5. Issues, in dependency order.** `save_issue` per slice, blockers first, so each
issue can name real `TEAM-123` identifiers. Set team, project, milestone, labels, and
the initial state from the conventions file.

Send markdown with real newlines in the description - not escaped `\n` sequences.

## Blocking edges

Check the `save_issue` schema you loaded for a relations or `blockedBy` parameter.

- **If it exists**, use it. Native relations are what makes Linear show the frontier.
- **If it does not**, record edges as a "Blocked by" section in the description naming
  the real identifiers, and tell the user which relations they will have to link by
  hand. Do not claim the graph is wired when it is only prose.

Sub-issues (`parentId`) are a different relation: use them for a genuine
parent/child breakdown, not to express blocking.

## Before you write

Search first: `list_issues` with the project or a text query for the work you are about
to create. Linear workspaces accumulate near-duplicates fast, and an issue created
twice is worse than one created late.

Never edit or close an issue this run did not create. If the breakdown supersedes an
existing issue, say which one and let the human decide.

## Idempotency

If a run fails partway, do not restart from zero. `list_issues` on the project to see
what already landed, report it, and continue from the first missing slice.
