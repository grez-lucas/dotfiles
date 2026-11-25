---
name: sp-task
description: 'Capture a Task on Lucas''s Super Productivity Eisenhower board through the sp-quadrant MCP, asking (or confirming an inferred) urgent/important quadrant in one keystroke, then returning to the work in progress. Writes the Task''s notes and checklist when he asks for a description or when context does not fit the title. Also moves and completes Tasks on that board, and adds notes or checklist items to a Task already on it. Use this whenever Lucas mentions something he needs to do later and wants it tracked, in any session or repo and in any phrasing - "anota esto", "agrega una tarea", "tarea: ...", "recuérdame ...", "mándalo al board", "a mi super productivity", "log a task", "add this to my board", "track this", "/sp-task ..." - when he says a tracked Task is done or should change quadrant ("ya hice X", "X ya no es urgente"), and when he wants to add to a tracked Task ("agrégale a X ...", "ponle una nota", "suma al checklist de X", "add a step to X"). Also use it when the session itself turns up work Lucas will have to do later, to offer that Task in one line.'
---

# Capture a Task on the Eisenhower board

The board is Super Productivity's Eisenhower board, driven by the `mcp__sp-quadrant__*` tools
(`create_task`, `list_tasks`, `move_task`, `complete_task`, `add_notes`). Vocabulary comes from
`~/Sandbox/sp-quadrant-mcp/CONTEXT.md`: **Task**, **Urgent**, **Important**, **Quadrant**, **Move**,
**Complete**, **Notes**, **Checklist**. Name quadrants by their panel: "Urgent and important", "Not urgent, important",
"Urgent, not important", "Neither". Never say Do / Schedule / Delegate / Delete or "priority".

Capture is an interruption. Keep it to one question at most, then go straight back to what the
session was doing.

## Flow

1. **Title.** Write one from what Lucas said: imperative verb first, in the language he used,
   at most ~80 characters. Append ` (<context>)` with the repo, project or person when the title
   alone would not make sense on the board a week later, e.g. `Rotar el token de SuperSync (supersync)`.
   `create_task` stores the title literally. Do not add dates, tags or `#`/`+` short syntax; what
   does not fit goes in the notes.
2. **Notes.** Write them when Lucas asks for a description, or when the session holds data that
   does not fit the title and that he will need to do the Task: who to ask, a link, an id, an
   amount, a date, a path, the reason behind it, or the steps. Leave them out when the title says
   it all. In markdown, in his language:
   - context first, as one or two short lines of facts;
   - steps as a checklist, one `- [ ] ` item per line, each an imperative verb, in the order he
     will do them;
   - only what Lucas said or the session established. Never invent steps, and never put a
     secret (token, password, key) in the notes: they sync to the iPhone.
   Pass them as `notes` to `create_task`. Asking about notes is never part of the one question.
3. **Quadrant.** If Lucas already said both (e.g. "urgente e importante", "no es urgente pero
   importa"), use that and do not ask. Otherwise infer it (rules below) and ask once with
   AskUserQuestion: one question, header `Quadrant`, the four panels as options, the inferred one
   first with `(Recommended)` and a one-line reason in its description. Enter accepts it.
   Several Tasks at once: one question per Task in the same AskUserQuestion call (max 4 per call).
4. **Duplicate check.** `list_tasks` with `query` set to the most distinctive word of the title.
   If an open Task clearly matches, do not create; say so and offer to move it, or to add the new
   notes to it with `add_notes`.
5. **Create.** `create_task` with the title, both booleans and the notes, if any.
6. **Confirm in one line** from what the tool returned, e.g. `Logged "Rotar el token de SuperSync (supersync)" -> Urgent and important.`
   With notes, say what they hold, e.g. `..., with context and 3 checklist items.`
   Then resume the previous work without further commentary.

## Inferring urgent and important

- **Urgent** - it has a time cost: a deadline within about a week, someone blocked waiting on it,
  something broken in production, or a window that closes (expiring cert, renewal, meeting).
- **Important** - it moves one of Lucas's goals or responsibilities forward, or not doing it has a
  real consequence: security, data, money, a commitment to someone, the health of a codebase he owns.
- No signal for urgency means not urgent. When importance is unclear, infer important for work Lucas
  owns and not important for nice-to-haves, curiosities and "maybe someday".
- Context counts: a Task raised mid-incident is likely urgent; a follow-up noticed during a
  refactor is likely "Not urgent, important".

## Offering a Task

Lucas wants Claude to notice Tasks too, but never to write one he did not approve.

- **Offer** work for Lucas that this session will not finish: a follow-up outside the current
  scope, something he said he would do later ("lo veo mañana", "después reviso"), a decision he
  parked, a reminder tied to a date (a renewal, an expiry, a check after a deploy).
- **Do not offer** what this session is about to do anyway, what his CLAUDE.md says to fix on the
  spot (lint errors, failing or flaky tests), work already tracked in an issue tracker, or anything
  he already declined in this session.
- **When:** at the end of the reply, never mid-task and never with AskUserQuestion, so the offer
  does not block the work. Several candidates go in one offer.
- **Format:** one line per Task, with the inferred quadrant already filled in, so a plain "sí"
  is enough:
  `Log to board? "Revisar el drill tras el próximo deploy (supersync)" -> Not urgent, important`
  When the Task would carry notes, show them right below its line, indented, so the "sí" approves
  them too.
- On yes, run steps 4 to 6 of the flow with that title, quadrant and notes; no further question. If he
  names a different quadrant, title or subset, use that. Silence or no means drop it and do not
  raise it again.

## Move and complete

- "X ya no es urgente", "esto sí es importante": `list_tasks` with a `query`, then `move_task` with
  the full new quadrant. Ask only if the query matches more than one open Task.
- "Ya hice X": `list_tasks` with a `query`, then `complete_task`. Same rule on ambiguity.

## Add notes or checklist items

"Agrégale a X ...", "ponle una nota a X", "suma al checklist de X ...": `list_tasks` with a
`query`, then `add_notes` with the Task's id and only the new text. Same rule on ambiguity.

- `add_notes` keeps what is there and appends: a `- [ ] ` item after a checklist continues it,
  anything else starts a new paragraph. Never resend the existing notes.
- `list_tasks` returns each Task's current `notes`: skip items already there, so nothing is added
  twice.
- The same content rules as step 2 of the flow apply: facts Lucas gave, no invented steps, no
  secrets.
- Confirm in one line, e.g. `Added 2 checklist items to "Renovar el dominio (aynitech)".`
- To tick or remove an item, or to rewrite the notes, there is no tool: say so and leave it to
  Lucas in SP.

## When a call fails

The tool error says what is wrong; relay it in one line with its fix, and include the title and
quadrant you meant to write so nothing is lost. The common ones:

- SP desktop not running or Local REST API off - ask Lucas to open SP; retry once he says so.
- Eisenhower tags missing - press "Create tags" on SP's Eisenhower board, then retry.
- Token rejected or missing - Claude Code needs a restart; the Task cannot be written this session.
- Any message saying a write "may already have been applied" or "did not answer when asked to
  confirm" - run `list_tasks` before retrying, so a retry does not create a duplicate; for
  `add_notes`, check whether the Task's notes already end with the text.
- `create_task` rejects `notes`, or `add_notes` does not exist - the installed sp-quadrant-mcp
  predates notes; create the Task without them, put the context in the confirmation line so it is
  not lost, and tell Lucas to upgrade the server (runbook below, "Upgrade the wrapper").

Full table: `~/Sandbox/sp-quadrant-mcp/docs/runbooks/install-and-recover.md`, "Error messages".
