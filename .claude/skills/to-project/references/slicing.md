# Slicing

How to cut a definition into issues that survive contact with an executor - human or
agent - who arrives with no memory of the conversation that produced them.

## The test for a good slice

Ask: **when this issue is done, what can somebody demo?**

If the answer is "nothing yet, you also need the other two", it is a horizontal slice
and it will hide integration risk until the last one lands. Re-cut it so each issue
carries a narrow but complete path through every layer.

If the answer is a sentence about a user doing something and getting a result, it is a
tracer bullet. Ship it.

**Example.** "Los usuarios pueden filtrar hallazgos por severidad."

- Horizontal, wrong: `añadir columna severity`, `endpoint de filtrado`, `dropdown en la UI`.
  Nothing is demoable until all three land, and the schema choice is only validated at
  the very end.
- Vertical, right: `filtrar hallazgos por una severidad`, then `filtro múltiple con
  persistencia en la URL`, then `filtro combinado con búsqueda de texto`. The first
  issue touches schema, API, UI and tests, and proves the whole path works.

## Sizing

An issue should fit in **one fresh context window** - everything an executor needs to
hold at once: the issue, the relevant code, the tests, the change. Signals it is too big:

- The criteria list runs past six or seven items.
- It touches two bounded contexts, or two services, for two different reasons.
- You cannot describe the outcome without the word "and" twice.
- Reviewing it would mean reading more than a few hundred lines of diff.

Signals it is too small: the title is the name of a function; finishing it changes
nothing observable; it only exists because the previous issue was written badly.

Prefer slightly too small over slightly too big. A small issue that lands is worth more
than a big one that stalls, and the frontier stays wide.

## Blocking edges

A blocking edge means **cannot start**, not "would be nicer afterwards". Ordering
preference is not a dependency, and encoding it as one collapses the frontier to a
single lane and serialises work nobody needed to serialise.

Real blockers usually look like: the schema this issue reads does not exist yet; the
contract this issue implements has not been agreed; the prefactor that makes this a
small change has not landed.

When in doubt, leave the edge off and say why - a missing edge shows up as one
confused executor, an invented edge shows up as a team waiting.

## Prefactoring

"Make the change easy, then make the easy change." If the feature is hard because the
current shape fights it, the first issue is the reshaping - behaviour-preserving, tests
unchanged and still green - and the feature slices are blocked by it.

Keep prefactoring issues honest: they change structure, not behaviour. An issue that
does both is two issues.

## Wide refactors: expand, migrate, contract

A wide refactor is one mechanical change - rename a column, retype a shared symbol,
swap a library - whose blast radius fans across the codebase. A single edit breaks
thousands of call sites at once, so no vertical slice can land green. Do not force it
into a tracer bullet. Sequence it:

1. **Expand** - add the new form beside the old. Nothing breaks; both work.
2. **Migrate** - move call sites over in batches sized by blast radius: per package,
   per directory, per service. Each batch is its own issue, blocked by the expand.
   CI stays green batch to batch because the old form still exists.
3. **Contract** - delete the old form once no caller remains. One issue, blocked by
   every migrate batch.

If even the batches cannot stay green alone, keep the sequence but let them share an
integration branch, and add a final integrate-and-verify issue that every batch blocks.
Say out loud that green is promised only there - a silent exception to the green rule
is how a team stops trusting CI.

## Spikes

When a slice cannot be scoped because nobody knows if the approach works, do not write
a vague issue and hope. Write a **spike**: timeboxed, with a question and a deliverable.

- Question: the specific thing you do not know.
- Timebox: real hours or days.
- Deliverable: a written answer, a prototype, or a decision record - never production code.

The slices that depend on the answer are blocked by the spike, and stay unwritten until
it resolves. Writing them now means rewriting them later.

## Slices that cross repos

If a slice needs changes in two repos, it is still one slice when the two changes are
worthless apart - the vertical path just spans repos. Say so in the issue and name both.

Split it only when one side is independently demoable, and then make the edge explicit.
The failure to avoid is a pair of issues in different trackers with no link between
them, each waiting for the other.

## Anti-patterns

- **Layer issues** - "backend", "frontend", "base de datos". Nobody can demo a layer.
- **Task lists dressed as issues** - a title that is a verb phrase about code, with
  criteria that restate the title.
- **Criteria that assert implementation** - call counts, file paths, function names.
  They go stale and they lock the executor out of a better design. Assert behaviour and data.
- **The bucket issue** - "pulir detalles", "varias mejoras". It never gets picked up,
  and when it does, nobody can tell when it is done.
- **Criteria invented to fill silence** - if the definition does not say what happens
  on failure, the answer is to ask, not to write a plausible criterion. Plausible and
  wrong is the most expensive kind of wrong, because it looks approved.
