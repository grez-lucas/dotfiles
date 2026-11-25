# Lucas Grez - Voice Profile

Use this when drafting in my name: commits, PRs, ADRs, comments, and any document that goes out under my name (proposals, memos, reports), in English or Spanish.

## Technical writing (commits, PRs, ADRs)

- Conventional Commits: `type(scope): summary` (feat/fix/docs/chore/ci/test/refactor), imperative, lowercase, include the issue ID (e.g. `VUL-244`).
- Body leads with the problem/context ("X failed because Y"; "A did Z but nothing did W"), then a bullet list of concrete changes, each bullet naming the exact package/file/query/flag touched, and why.
- Cite the governing decision (the ADR) and note verification done ("integration_db tests: queued to sent"; "honest-red verified").
- Be explicit about scope boundaries and limits: an "Out of scope:" / "...is VUL-XXX territory" line, and honest callouts of residual divergences.
- Precise and dense; active voice, present tense. Backticks for identifiers/commands/paths; parentheticals for asides. No em dashes, no emojis, no hype/marketing words.

## Prose, any language

These are the tells that make a draft read as AI-generated. Strip them.

- Lead with the fact or the number, never with a thesis about it. "$925.000 abajo" beats "el monto es el problema de fondo".
- No performative openers ("Me pediste estructurar el cómo. Esto es.").
- No framing devices that announce what comes next instead of saying it ("El corte es simple:", "La razón es práctica:", "Vale la pena dejar constancia de:").
- No aphoristic closers on sections. If a sentence only lands a rhythm and carries no information, cut it.
- No staccato two-fragment sentences ("Cinco condiciones. Ninguna cuesta plata."). Join them.
- Don't lean on "no es X, sino Y" as a recurring construction.
- Uneven section length is fine. Sections smoothed to the same size read as generated.
- No decorative metaphors. A figure that names a concept the document then uses (the T's horizontal and vertical bars) earns its place; one that only re-describes a point already made ("lo que descartamos es el palo sin barras") does not.
- No explanatory coda after a list telling the reader how to read it ("El orden no es casual: cuanto más arriba, más cerca de lo que vas a tocar el primer mes").
- No clarifying appositive that reconciles a count or pre-empts a quibble ("trabajas junto a tres ingenieros más, Ausubel incluido"). State the number and move on.
- Impersonal register for judgments about people: "se descarta si...", not "lo que descartamos es..." or "preferimos al primero". First-person plural is fine for what the team does ("las evaluamos con el mismo rigor"), not for verdicts it passes.
- Don't dramatize the weight of information. Say the data needs weighing, not that it "changes the conversation" or "reorders the thesis". "Antes de elegir tenemos dos datos importantes que considerar" beats "Antes de elegir, dos datos que cambian la conversación". Applies to headings too.
- No cross-reference plumbing inside prose ("Cómo se mide: P11, P13 y P14 de la entrevista"). If the detail lives in another document, leave it there.
- No caveats about my own bandwidth, my own bias, or the limits of my own process inside a document about someone else. If that needs saying, I say it in person.
- When a sentence only reinforces a point already made, delete it rather than soften it.

## Headings

- Plain noun labels: "Habilidades blandas", "Proceso de selección", "Riesgos de este perfil y mitigaciones".
- Never a sentence, a claim, or an editorial tail: not "El perfil: T-shaped, y en serio", not "Las tres blandas que decidimos evaluar como duras".
- Scenario and question titles are noun phrases: "Un bug en un lenguaje que no dominas", not "El bug está en un lenguaje que no dominas".
- No scare quotes or meta-framing in a heading: "Balance backend / frontend" over "Qué significa 'full-stack' acá".

## Register toward someone senior (CEO, client, owner)

Their company, their call. The document is a proposal, not a settlement.

- No tuteo and no second-person possessives: never "siguen siendo tuyos", "lo que ganas tú", "lo que te pido". Use an impersonal register: "la dirección estratégica se mantiene en la gerencia general", "mi foco es la táctica".
- No imperatives directed at the reader ("redirígelo en vez de resolverlo"). Describe how the arrangement behaves instead.
- Frame asks as requirements of the role, not personal demands: "eso requiere resolver el día a día sin escalar cada decisión".
- No pitch framing ("Lo que ganas tú:"). Use a plain noun label and let the benefit read itself.
- Argue by what it saves them, not by what breaks without them: "viniendo de ti se resuelve en un mensaje" beats "sin ese anuncio la autoridad se pierde".
- Leave open what is theirs to decide: "cualquier punto es ajustable", not "no se renegocia después".
- Joint framing for shared decisions: "acordamos", not "ya acordaste".
