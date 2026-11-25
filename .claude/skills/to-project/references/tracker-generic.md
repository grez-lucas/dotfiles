# Adapter: any other tracker

Jira, Azure DevOps, Shortcut, Asana, Trello, Notion databases, YouTrack. No hand-written
adapter here, so work from the contract below and from whatever access you actually
have - an MCP server, a CLI, a REST API with a token in the environment.

## Find the access route first

Before planning any writes, establish how you will write, and say it out loud:

1. **An MCP server for the tracker** - load its schemas with `ToolSearch` and read the
   parameter lists. Never call an MCP tool from memory; names and required fields vary.
2. **A CLI** (`jira`, `az boards`, …) - check it is installed and authenticated with a
   read command before attempting a write.
3. **A REST API** - only with a token the user has already configured. Do not ask for
   credentials, do not put one in a file, and do not paste one into a command that gets
   logged.
4. **Nothing works** - say so and offer `references/tracker-local.md`. Files the user
   can paste in beat a half-published project.

Verify with a **read** before any write. One `list projects` call proves auth, the
right workspace, and the identifiers you need, and costs nothing if it fails.

## The contract every tracker must satisfy

Whatever the vocabulary, the published result has to provide these. Map each one to the
tracker's own concept and tell the user the mapping you used:

| Needed | Common names |
|---|---|
| A container for the work | project, epic, initiative, board, sprint, database |
| An independently grabbable unit | issue, ticket, work item, story, task, card |
| A demoable increment | milestone, fix version, iteration, phase |
| A "cannot start until" relation | blocks / is blocked by, dependency, predecessor |
| Classification | labels, tags, components, issue type, custom fields |
| A starting state | status, column, workflow state |

Where a tracker has **no** native blocking relation, degrade to a "Blocked by" section
in the description naming real identifiers - and say plainly that the graph is prose,
not links, so nobody assumes the board will surface the frontier.

Where a tracker forces a **required field** the conventions file does not mention - Jira
issue type, Azure area path - stop and ask. Guessing a required field means every issue
in the project inherits the guess.

## Sequence

1. Read the vocabulary: available types, labels, states, existing projects.
2. Reconcile it against the conventions file. Report drift, do not paper over it.
3. Create or attach the container.
4. Create the increments, if the tracker has them.
5. Create issues in dependency order, blockers first, capturing real identifiers.
6. Wire the blocking relations, natively if possible.
7. Apply labels and the initial state.

## After a first successful run

You have now learned this tracker's shape the expensive way. Offer to write it into the
conventions file - access route, field mapping, required fields, gotchas - so the next
run does not rediscover it. That is how a generic adapter turns into a specific one.
