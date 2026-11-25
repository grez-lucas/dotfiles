# The briefing pack

Read this before writing `brief.html`. It defines what goes in, what must never
go in, and how the document should feel.

Contents:
- [What it is for](#what-it-is-for)
- [Section structure](#section-structure)
- [The contraband test](#the-contraband-test)
- [What may appear in a code block](#what-may-appear-in-a-code-block)
- [Craft](#craft)

## What it is for

One job: make sure the user is never blocked on *not knowing where to look*, only
on *doing the thinking*.

Everything in the brief should be knowledge - things a colleague would tell them
in two minutes, that cost nothing to hand over and are not the skill being
learned. Nothing in it should be judgement - decomposition, design, algorithm,
their solution.

It will be read on a second monitor while they code, and returned to weeks later.
Write for that: scannable, dense, quiet, no filler.

## Section structure

Adapt the order to the task, but these are the sections that earn their place.

**1. The task.** Restated in one paragraph, in the domain's own language, plus the
acceptance criteria verbatim from the tracker if there is a ticket. This is the
definition of done and it belongs to the issue, not to you.

**2. What you'll be able to do afterwards.** Two or three concrete capabilities.
Not "learn about middleware" - "trace a request through our middleware chain and
say which layer set a given header". This is what the user checks themselves
against at the end, so make it observable.

**3. Concepts.** Short cards, one per idea, only the ones actually needed for this
task. Each: what it is, why it exists, the one misconception people hold about it,
and a link to the primary source. Cite inline and generously. If a concept can be
skipped without blocking a rung, cut it - a brief that teaches everything adjacent
is a brief nobody finishes.

**4. The territory.** A map of the repo as it relates to this task: which files
own what, what is generated, what they must not touch, where the seams are. Name
the precedent here - the existing code that solved a sibling problem - with one
line on why it is relevant. Resist annotating how it maps onto their task.

**5. Worked example - often the right answer is none.** Before writing one, ask
whether the repo already contains a precedent for this pattern. If it does, that
precedent *is* the worked example, and a second version of the same algorithm in
another domain is a disguised duplicate: it adds nothing the precedent lacks, and
it is more dangerous than the precedent because it reads as sanctioned to copy.
Point at the precedent and move on.

Write one only for a shape the repo cannot show them. When you do, demonstrate
the *ceremony or the seam* - how a dependency is injected so a test can observe
it, how a fixture is wired - rather than the algorithm they are here to derive.
Keep it small; "complete and runnable" is not a virtue here, and a full working
version of their control flow is contraband no matter what the variables are
called.

Ceremonial boilerplate with no decisions in it - a table test skeleton, imports,
a build tag - can be shown in their own domain, because typing ceremony teaches
nothing.

**6. The ladder.** The rungs, in order. Each with goal, done-when, where to look,
and the trap - as defined in SKILL.md. This is the spine of the document; make it
visually distinct and easy to return to.

**7. Verification.** The exact commands, copy-pasteable, that tell them whether
they are right. Test, lint, build, and any suite the ordinary targets miss. Say
what a healthy run looks like so they can recognise an unhealthy one, and restate
the acceptance criteria as the checklist you will both walk at the end - green
tests are evidence about the tests, not proof the criteria are met.

**8. Traps.** Things that will burn an hour and teach nothing. Phrase each as the
question to hold in mind rather than a rule to obey - "is the generated client
stale?" beats "remember to regenerate the client".

A trap must warn about the cost of a wrong turn without narrating the right one.
"If you move something in the chain, what else moved relative to it?" presupposes
that moving something is the answer, and a learner reads that presupposition
instantly. Write every trap so it would still make sense to someone who has not
been told the solution - if it only makes sense once you know the fix, it *is*
the fix.

**9. References.** Every source cited, as links, grouped. Primary documentation
first, then anything else.

**10. Ask your mentor.** A short reminder that the session is still open, with
three or four concrete example questions worth asking. Left out, people forget
the mentor exists and grind alone; and knowing which questions are fair game is
itself part of learning to ask for help well. Set the expectation honestly here:
factual questions get answered straight away, and anything about design or a bug
gets questions back, because that is the part they are here to build.

## The contraband test

Before any snippet goes in, two questions, and it fails on either:

1. **Could they paste this into their branch and have it work, in whole or part?**
2. **Could they get there by find-and-replacing the identifiers?**

The second is the one that catches the plausible-looking mistake. An example can
sit in a completely different domain and still be the answer, because what
transfers is the control flow, not the nouns. If your example loops over attempts
with a `delay`, a `last` error, a break on the final try and a re-raise, then
renaming files to configs has hidden nothing - the learner transcribes it and
derives none of it.

So changing the domain is not sufficient. The example must differ in *shape*, or
demonstrate a different part of the problem than the part they are solving.

If they are writing rate limiting for an API, the example limits disk writes. If
they are writing a parser for a config format, the example parses roman numerals.
Structurally the same, concretely unusable. The transfer between the two is the
learning, and it is theirs to do.

The related failure is subtler and just as fatal: an example in a safely different
domain, followed by "so for your case, you'd swap X for Y and call it in the
handler". That sentence hands back everything the analogy protected. Show the
shape, name it, stop.

## What may appear in a code block

Allowed:
- Existing code in their repo, quoted as a precedent, without a mapping to their
  task.
- Analogous worked examples that pass the contraband test.
- Ceremonial boilerplate with no decisions in it - imports, a test function
  skeleton, a build tag, a struct tag.
- Commands to run.
- Library and API usage straight from the official docs.
- A failing test, but only one the user explicitly asked you for, under the rules
  in the mentor protocol: boundary behaviour only, no names they have not
  designed, no expected values that give away the algorithm. Never pre-load the
  brief with tests they did not request - writing them is part of their work.

Not allowed:
- Any function, type, or test they were asked to write - even partially, even
  commented out, even as a signature. Choosing the signature is design work.
- Pseudocode of their algorithm. Step-by-step English is still the answer.
- A `TODO`-shaped stub of their solution. It looks like restraint and functions
  as a spoiler: it fixes the decomposition, which was the hard part.
- Diffs against their code.

The reliable instinct: if writing it made you feel like you were doing the task,
you were.

## Craft

The brief is a document the user keeps. Make it worth keeping.

- **Link the shared stylesheet**, `../assets/brief.css`, rather than inlining
  styles. Every brief in the workspace should look like part of one course.
- **Tufte, not bootcamp.** Generous margins, a real reading measure (~65
  characters), restrained colour, no emoji headers, no progress bars, no
  gamification. Respect the reader.
- **Print cleanly.** The stylesheet has a print block; do not break it with dark
  backgrounds on large areas.
- **Anchor every section** (`id` on each heading) so you can link the user
  straight to `brief.html#rung-3` mid-conversation.
- **No dead links.** If you cite something, you fetched it. Do not cite from
  memory - a broken reference in the one document meant to stop them getting lost
  is the worst possible bug in this skill.
