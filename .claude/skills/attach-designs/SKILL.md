---
name: attach-designs
description: Walk every issue in a tracker epic or project, find the matching views in a Figma file or a set of HTML mockups, and attach deep links plus screenshots into each issue's designs section - recording explicitly which views do not exist yet and which ones contradict their ticket. Use this whenever someone wants designs connected to tickets, in any phrasing - "adjunta los diseños a los tickets", "pega los links de Figma en la épica", "conecta el Figma con Linear", "sube los mockups a los issues", "attach Figma screenshots to the issues", "link the designs to these tickets", "add the mockups to the epic" - or names a Figma file or a mockup folder together with a Linear project, epic, milestone or list of issues. Also use when someone asks which screens are still missing from the design file relative to the backlog, or wants to know whether the designs still match what the tickets say.
---

# Attach Designs

Connect an epic's issues to the views that show what they look like, so a developer
picking up a ticket cold can see the screen without hunting through a Figma file.

The typing is not the value. Three things are:

1. Every issue carries a **deep link and a screenshot** of the exact frame, by node id,
   so nobody has to search by name.
2. Every **missing view is named out loud** in the ticket as pending, instead of the
   ticket quietly looking complete.
3. Every frame that **contradicts its own ticket** is flagged. That is where the real
   bugs live: a design that looks finished but encodes a flow or a wording the team
   already ruled out will get built exactly as drawn.

You are a careful librarian here, not an author. You move what exists and report what
does not. You never draw the missing screen, and you never soften a mismatch.

---

## Step 0 - Ask, do not guess

If the invocation arrives without both of these, **stop and ask**. Use
`AskUserQuestion` (fall back to a plain question in chat if that tool is unavailable):

1. **Which project / epic?** The Linear project, epic, milestone, or explicit issue
   list. Offer the user's recent projects as options if you can list them cheaply, plus
   an "other - I'll paste it" escape.
2. **Which visual source?** A Figma URL, or a path to the HTML mockups. Offer both as
   option shapes.

Guessing here is the one failure mode that wastes the whole run. There is usually more
than one plausible Figma file in a workspace and more than one epic in flight, and a
run pointed at the wrong pair produces confident, wrong edits across a dozen tickets.
Never go hunting for the "probably right" file. Ask.

Worth asking in the same turn when it is genuinely ambiguous: whether to cover the
whole epic or a subset, and whether to attach screenshots or links only.

---

## Guardrails

These are not style preferences. Issues are the team's contract with itself; an agent
that rewrites them loses that contract.

- **Touch only the designs section.** Description, acceptance criteria, testing
  requirements, technical notes, edge cases and open questions stay byte-identical.
- **Never** change status, assignee, labels, milestone, estimate, priority, parent or
  relations. Never create, close, or duplicate an issue.
- **Never invent a view.** "This screen does not exist yet" is a correct, expected,
  valuable outcome. Writing a plausible-sounding link or describing a screen you did
  not see is the worst thing this skill can do.
- **Verify every edit** by re-reading the issue afterwards. A patch that silently
  matched the wrong anchor is worse than a patch that failed.
- **Write in the language the issues are written in.** If the epic is in Spanish, every
  line you add is in Spanish.

---

## Step 1 - Preflight before any bulk work

Check access first. A run that dies on issue 7 of 14 leaves the epic half-edited and
the next run has to figure out what already happened.

**Figma source:**
- `mcp__claude_ai_Figma__whoami` - confirms the connection is alive and authenticated.
- `mcp__claude_ai_Figma__get_metadata` with **only** `fileKey`, no `nodeId` - returns the
  file's top-level pages. This proves you can read the file and gives you the map.

**HTML source:**
- Confirm the files exist and are readable, and that
  `npx -y playwright screenshot --help` works. See `references/html-mockups.md`.

**Linear:**
- Read one issue from the epic end to end before editing anything.

If any check fails, say so and stop. Do not fall back to a different file or a
different source without asking.

---

## Step 2 - Learn the house format

The designs section has a shape, and the point is that your edits look like the ones a
human wrote. Look, in order, for:

1. `./.claude/pm-conventions.md` in the working repo
2. `~/.claude/pm-conventions.md`
3. Whatever `CLAUDE.md` points at

That file's issue template defines the designs section - its heading, its language, its
line format. Follow it. If no conventions file exists, derive the format from the
issues themselves: read two or three, find the heading they already use for designs
(`## Diseños`, `## Design`, `## Mockups`), and match it. If the issues have no designs
section at all, propose a format to the user once and reuse it for the whole epic
rather than inventing per-issue. A reasonable default to propose, which carries all
three outcomes:

```markdown
## Diseños

- **Modal de cierre** - [Figma](https://www.figma.com/design/KEY/Soporte?node-id=482-1130) · node `482:1130`
  ![Modal de cierre](https://uploads.linear.app/.../modal-cierre.png)
- **Encuesta de satisfacción** - [Figma](...) · node `482:2214`
  ⚠️ Desactualizado: los dos chips dicen "Aún tengo dudas"; el criterio pide que uno sea la respuesta positiva.
- **Estado vacío del historial** - ⏳ Pendiente de diseño (Diseño).
```

The shape that matters is one line per view, each carrying the identifier, and the
outdated and pending cases visibly different from the clean ones - so a reader scanning
the section sees at a glance what is ready and what is not.

---

## Step 3 - Read the epic, then inventory the source

**Read every issue first**, before looking at a single frame. `list_issues` with the
project, then `get_issue` per issue. For each one keep:

- Its title and what screen(s) it implies
- Its **Description**, **Acceptance Criteria**, and any **Resolved Open Questions** or
  equivalent decisions section

That last part is the whole basis for judging outcome 3 below. You are comparing each
frame against *what this ticket says the screen must do* - not against your own taste
in UI. A ticket that says the confirmation button reads "Marcar como resuelta" is the
authority; a frame that says something else is wrong, however nice it looks.

**Then inventory the source.** Build one flat list of every candidate view with its
identifier (Figma node id, or mockup file + state), before matching anything. Source
mechanics live in:

- `references/figma.md` - file keys, node ids, page traversal, screenshot sizing,
  misnamed frames, discarded clusters
- `references/html-mockups.md` - safe copies, driving JS states, capture commands

---

## Step 4 - Match each issue to views, with three outcomes

This is the judgement step and the reason the skill exists. For each issue, for each
view it needs, land on exactly one of:

**1. Exists and matches.** The frame shows what the ticket specifies.
→ Deep link + node id + screenshot in the designs section.

**2. Does not exist.** No frame covers this view.
→ An explicit pending line naming *what is missing* and *who owes it*. Not "pending
designs" - "falta el estado vacío del historial de conversaciones (Diseño)". A vague
pending line is indistinguishable from nobody having looked.

**3. Exists but contradicts the ticket.** The frame is there, but it reflects an older
flow, has wrong copy, or is missing a state the criteria require.
→ Link it anyway (the developer still needs to see it), mark it clearly as outdated
with *what specifically* is wrong, and carry it into the final report as a design bug.

Outcome 3 is the one that earns the run. In practice it catches things like a button
reading "Marcar como termianda" (typo shipped into the design), two chips in a survey
both reading "Aún tengo dudas" when one should be the positive answer, or out-of-hours
copy using wording the team explicitly rejected. A developer implementing from those
frames builds the wrong product and the review catches it three weeks later, if at all.

Never collapse outcome 3 into outcome 1 because the frame is "close enough", and never
collapse it into outcome 2 because the frame is wrong. Both erase the finding.

**Confirm by content, not by name.** Frame names lie - they get copied, renamed
halfway, or left from a previous flow. Before you attach a frame, look at its
screenshot or its text content and confirm it is the screen the ticket describes. This
is also why the node id goes into the issue: so the next person navigates by id rather
than searching for a name that may not mean what it says.

---

## Step 5 - Write into the issue

One issue at a time, end to end, so a failure never leaves a half-written section.

**Editing:** `mcp__claude_ai_Linear__save_issue` with the **`patch`** parameter, anchored on
exact existing text you just read. Never pass a full `description` - a rewrite is how
acceptance criteria quietly lose a line. See `references/linear-writes.md` for the
patch shapes and the verified screenshot upload sequence, including the 60-second
signed-URL expiry that makes batching uploads fail.

**Budget discipline:** if a screenshot upload fails twice on one issue, fall back to
links-only for that issue, record it in the failures list, and move on. Grinding on one
upload starves the other twelve tickets.

**Verify:** re-read the issue after each edit and confirm the designs section is what
you intended and nothing else changed.

---

## Step 6 - Report

The report is a deliverable for the designer, not bookkeeping. Structure it exactly
like this, in the language of the issues:

```
## Resumen

| Issue | Frames enlazados | Screenshots | Pendientes |
|---|---|---|---|
| ABC-12 | 3 | 3 | 0 |
| ABC-13 | 1 | 1 | 1 |

## Vistas que no existen todavía
- ABC-13 - estado vacío del historial. Falta diseñarlo.
- ABC-17 - modal de confirmación en mobile. Solo existe la versión desktop.

## Frames que contradicen su ticket
- ABC-14 / node 482:1130 - el botón dice "Marcar como termianda" (typo);
  el criterio pide "Marcar como resuelta".
- ABC-15 / node 482:2214 - los dos chips de la encuesta dicen "Aún tengo dudas";
  uno debería ser la respuesta positiva.

## Fallos
- ABC-16 - subida de screenshot falló dos veces (403 en el PUT); quedó solo el link.

## Omitido
- 4 frames bajo el cluster "NO VA" en la página Flujos - descartados, no enlazados.
```

The two middle lists are the point. Lead with them when you summarise in chat: they are
a work order for the designer and a bug list for the PM. If both are empty, say so
explicitly - "todas las vistas existen y coinciden con los tickets" is a real result,
but only if you actually checked each one.

Also state plainly what you skipped and why. A cluster of frames you decided was
deprecated is a decision the user may disagree with, and silent skipping hides it.

---

## Bundled helpers

Paths are relative to this skill's directory.

| File | What it is for |
|---|---|
| `references/figma.md` | File keys, node id spellings, page traversal, screenshot sizing, misnamed frames, discarded clusters |
| `references/html-mockups.md` | What renders HTML here, safe copies, driving JS states |
| `references/linear-writes.md` | `patch` shapes, the verified upload sequence, the 60s expiry |
| `scripts/capture_html.sh` | Capture one state of an HTML mockup to PNG without writing into the source tree. `--help` is the header comment. |
| `scripts/linear_put.sh` | PUT a screenshot to a Linear signed URL with every signed header verbatim; explains a 403 correctly |
