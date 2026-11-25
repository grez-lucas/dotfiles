---
name: obsidian-ai-research
description: Search, create, and manage AI research notes in Lucas's Obsidian vault, following the vault's AGENTS.md rules (Research/ folder, frontmatter properties, topic hubs). Use this whenever the user wants to capture, find, or organize anything about AI research - models, papers, techniques (RAG, agents, fine-tuning, evals, prompting), tools, or concepts - even if they don't say "Obsidian" or "note". Trigger on phrases like "add a note on...", "what do I have on...", "capture this...", "save this to my vault", "make an index for...", or "link this to...".
---

# Obsidian AI Research Notes

Capture AI research as atomic, interlinked notes that are easy to find again. Linking matters as much as content: an unlinked note is nearly invisible.

## Vault rules come first

Read `~/Documents/obsidian-vault/AGENTS.md` before writing anything. It defines folders, properties, naming and how to move notes, and it wins over anything in this skill. The reasons are in `Documents/ADR 0001 - Vault Organized By Note Type.md`. A PostToolUse hook validates every note you write in the vault and reports violations; fix them before moving on.

The parts that matter most here:

- **Folder:** AI research notes you write go in `Research/`. Never create notes in `Concepts/`; that folder is for Lucas's own writing. Vault folders are flat.
- **Topic hubs replace hand-built index notes.** A hub in `Topics/` (for example `Topics/AI Coding Agents.md`) embeds a Base that lists every note whose `topics` property links to it. Grouping a note under a topic means adding the topic to its `topics`, not editing a list. Topic hubs exist for topics with 8 or more notes; create one in `Topics/` only once a topic reaches that size (AGENTS.md shows the hub format).

## Note format

```markdown
---
created: 2026-10-01T14:05
author:
  - claude
topics:
  - "[[Retrieval Augmented Generation]]"
  - "[[AI Coding Agents]]"
---
## What is it? 🤔

## How does it work? 🔧

## When is it useful? 📅

### Pros ✅

### Cons 🚫

---
# References
```

- **`created`**: run `date +"%Y-%m-%dT%H:%M"` rather than guessing; a wrong date pollutes the Recent views.
- **`author`**: `claude` for notes you write. When you edit an existing note, append `claude` to its `author` if it is missing.
- **`topics`**: quoted wikilinks to the subjects the note belongs to. Prefer existing topic hubs (`ls ~/Documents/obsidian-vault/Topics/`) so notes aggregate; a topic without a note yet is allowed. This replaces the old `#ai-research` tag line.
- **`projects`**: add it only when the research serves a project hub in `Projects/` (e.g. `"[[Gymly]]"`).
- No timestamp line, `Status:` line or `Tags:` line in the body, and no H1 repeating the filename.
- **Sections**: the five-section skeleton fits most conceptual notes but is a scaffold, not a cage. A paper summary might use `## Summary` / `## Key contributions` / `## Limitations`; a tool note `## What it does` / `## Setup`. Keep the emoji-suffixed style and keep notes atomic (one idea per note).
- **Concrete examples are required for practical topics.** For anything the reader might do (a technique, algorithm, tool, protocol or workflow), include at least one specific worked example or a step-by-step runbook under `### Example 💡` (or `## Runbook`). Examples of concrete: a ReAct `Thought → Action → Observation` trace with real strings; a numeric walk-through of Reciprocal Rank Fusion; a short runnable snippet in a fenced block. Purely conceptual notes (a definition, a taxonomy) don't need one. A procedure Lucas will execute repeatedly belongs in `Runbooks/` instead of `Research/`.
- **References footer**: the trailing `---` then `# References` block holds outbound `[[wikilinks]]` to related notes.

## Naming

- Title Case, the full canonical term: `Retrieval Augmented Generation.md`, referenced as `[[Retrieval Augmented Generation|RAG]]`.
- Unique across the whole vault (links resolve by filename alone), no emoji, no underscores.

## Linking

- Use `[[wikilinks]]` inline for any concept that has or deserves its own note, and collect the important ones in `# References`.
- Dangling links to notes that don't exist yet are fine; they record a real relationship.
- Check spelling against existing notes first so one idea doesn't split into two graph nodes.

## Workflows

### Create a note

1. Search first; update an existing note instead of creating a near-duplicate.
2. Pick a Title Case filename; run `date +"%Y-%m-%dT%H:%M"`.
3. Write `Research/<Title>.md` in the format above, with `topics` pointing at existing hubs where they fit.
4. Add `[[wikilinks]]` to related existing notes.
5. Read the hook's output; if it reports violations, fix them.

### Search for notes

Search the whole vault, not one folder: AI material lives in `Research/`, `Topics/`, `Documents/` and `Concepts/`.

```bash
V="$HOME/Documents/obsidian-vault"
find "$V" -path "$V/.git" -prune -o -name "*.md" -print | grep -i "keyword"       # by filename
grep -rl --include="*.md" "keyword" "$V/Research" "$V/Topics" "$V/Concepts" "$V/Documents"  # by content
grep -rl --include="*.md" '"\[\[AI Coding Agents\]\]"' "$V"                     # notes in a topic
```

The Grep/Glob tools work on these paths too and are usually preferable.

### Find backlinks

```bash
grep -rl --include="*.md" "\[\[Note Title" "$HOME/Documents/obsidian-vault"
```

Matching `[[Note Title` without the closing `]]` also catches `[[Note Title|alias]]` and `[[Note Title#heading]]`.

### Rename or move a note

Never use `mv`. Use the vault's mover, which rewrites every link (dry run first):

```bash
"$HOME/Documents/obsidian-vault/.tools/vault" mv "Research/Old Name.md" "Research/New Name.md"
"$HOME/Documents/obsidian-vault/.tools/vault" mv --apply "Research/Old Name.md" "Research/New Name.md"
```
