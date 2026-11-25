/*
 * decision-kit.js: one-press structured submit for a decision page published as a
 * claude.ai artifact. Dependency-free classic script, published beside the page.
 * The page declares capabilities {db:{},user:{},comments:{}}. See SKILL.md.
 *
 *   window.decisionPage.submit({title, items, text, data})  -> {state, doc, round, reason}
 *   window.decisionPage.endReview()                         -> {state, reason}
 *   window.decisionPage.latest()                            -> latest answer doc, or null
 *   window.decisionPage.saveDraft(value) / loadDraft()      -> this viewer's browser only
 *
 * Script tag attributes: data-status (selector of the status line; default the
 * first [role=status], else the kit adds one), data-controls
 * (selector of the button row), data-end-review (opt in to the End review control).
 */
(() => {
  "use strict";
  if (window.decisionPage) return;

  const TIMEOUT_MS = 10000;
  const CONFIRM_MS = 5000;
  const MAX_DOC_BYTES = 256 * 1024;
  const LATEST_WINDOW = 20;
  const REVIEW_DOC = "review/state";
  const IN_CHAT = 'Say "answers saved" in chat so Claude reads them.';
  // Refusals the contract calls permanent for this view: asking again cannot help.
  const PERMANENT = ["forbidden", "not_granted", "capability_disabled", "capability_removed"];
  const NOT_SENT_WHY = {
    consent_required: "this page was not allowed to comment",
    forbidden: "commenting from this page is off here",
    claude_unavailable: "no Claude session could receive it",
    no_session: "no Claude session could receive it",
    writers_only: "only editors can send to Claude",
    off: "sending to Claude is off in this view",
    rate_limited: "sent too often, slow down",
    late: "the save landed after the press",
  };
  const NOT_SAVED_WHY = {
    no_db: "saving is not available in this view",
    read_only: "your access here is read-only",
    too_large: "the answers are over the 256 KiB limit",
    invalid_payload: "the answers could not be serialised",
    timeout: "the store did not answer in 10 s",
    quota_exceeded: "the store is full",
  };

  const tag = document.currentScript;
  const realLavish = !!window.lavish;
  const attr = (name) => (tag ? tag.getAttribute(name) : null);
  const codeOf = (e) => (e && e.code) || "unavailable";
  const pick = (selector) => {
    try { return selector ? document.querySelector(selector) : null; } catch (e) { return null; }
  };

  let ownRoot = null;
  let statusEl = null;
  let box = null;
  let endButton = null;
  let lastControl = null;
  let inFlight = null;
  let attempts = 0;
  let knownRound = 0;
  let lastSent = null;
  let commentsOff = null;
  let viewerFacts = null;

  document.addEventListener("click", (ev) => {
    const t = ev.target;
    lastControl = (t && t.closest && t.closest("button,a,input,[role=button]")) || t;
  }, true);

  function root() {
    if (!ownRoot) { ownRoot = document.createElement("div"); document.body.appendChild(ownRoot); }
    return ownRoot;
  }
  const controls = () => pick(attr("data-controls")) || root();
  function status(text) {
    if (!statusEl) statusEl = pick(attr("data-status")) || pick("[role=status]");
    if (!statusEl) {
      statusEl = document.createElement("div");
      statusEl.setAttribute("role", "status");
      statusEl.setAttribute("aria-live", "polite");
      root().appendChild(statusEl);
    }
    statusEl.textContent = text; // viewer data never reaches innerHTML
  }
  function showBox(text) {
    if (!box || !box.isConnected) {
      box = document.createElement("textarea");
      box.className = "manual"; // the page's own class for this box, when it has one
      box.rows = 6;
      box.readOnly = true;
      box.style.flex = "1 1 100%";
      box.style.width = "100%";
      controls().appendChild(box);
    }
    box.value = text;
    box.focus();
    box.select();
  }

  function use(name) {
    try {
      if (!window.claude || typeof window.claude.use !== "function") return Promise.resolve(null);
      return Promise.resolve(window.claude.use(name)).catch(() => null);
    } catch (e) { return Promise.resolve(null); }
  }
  function timed(promise) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject({ code: "timeout" }), TIMEOUT_MS);
      Promise.resolve(promise).then(
        (v) => { clearTimeout(timer); resolve(v); },
        (e) => { clearTimeout(timer); reject(e); },
      );
    });
  }
  function viewer() {
    if (!viewerFacts) {
      viewerFacts = (async () => {
        const facts = { id: null, owner: false, canWrite: null };
        const user = await use("user");
        if (!user) return facts;
        try {
          const [me, canWrite] = await timed(Promise.all([user.me(), user.can("data.write")]));
          return { id: me.id || null, owner: me.isOwner === true, canWrite }; // ids only, never a name
        } catch (e) { return facts; }
      })();
    }
    return viewerFacts;
  }
  // The pressed control when it sits inside the hint, else the hint.
  function anchorElement(hint) {
    const c = lastControl;
    if (c && c.isConnected && (!hint || hint.contains(c))) return c;
    return hint || document.body;
  }

  const hasNote = (i) => !!(i.note && String(i.note).trim());
  function isChanged(i) {
    if (!i || typeof i !== "object") return false;
    if (i.changed === true || i.asRecommended === false || hasNote(i)) return true;
    if ("recommended" in i) return String(i.pick !== undefined ? i.pick : i.answer) !== String(i.recommended);
    return false;
  }
  const newer = (a, b) => (Number(a.round) || 0) - (Number(b.round) || 0)
    || String(a.submittedAt || "").localeCompare(String(b.submittedAt || ""));

  async function readLatest(db) {
    const snap = await timed(db.collection("answers").orderBy("round", "desc").limit(LATEST_WINDOW).get());
    const docs = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
    return docs.reduce((best, d) => (!best || newer(d, best) > 0 ? d : best), null);
  }
  async function latest() {
    const db = await use("db");
    if (!db) return null;
    try { return await readLatest(db); } catch (e) { return null; }
  }
  async function nextRound(db) {
    try {
      const doc = await readLatest(db);
      if (doc) knownRound = Math.max(knownRound, Number(doc.round) || 0);
    } catch (e) { /* saving matters more than ordering: fall back to what this page knows */ }
    return knownRound + 1;
  }

  // Everything before the send, started at the press so the gesture stays recent. Never rejects.
  async function prepareWake(element) {
    if (commentsOff) return { why: commentsOff };
    const comments = await use("comments");
    if (!comments) return { why: "no_comments" };
    try {
      const [can, anchor] = await timed(Promise.all([comments.canSendToClaude(), comments.anchorFor(element)]));
      return can === "available" ? { comments, anchor } : { why: String(can) };
    } catch (e) { return { why: codeOf(e) }; }
  }
  // Resolves to null when sent, else to the reason. Never rejects, never retries.
  async function sendWake(wake, text) {
    if (wake.why) return wake.why;
    try {
      await wake.comments.sendToClaude({ anchor: wake.anchor, text });
      return null;
    } catch (e) {
      const why = codeOf(e);
      if (PERMANENT.includes(why)) commentsOff = why;
      return why;
    }
  }

  async function copy(text) {
    try { await timed(navigator.clipboard.writeText(text)); return true; } catch (e) { return false; }
  }
  // The box and the instruction show at once: a clipboard call in a frame can hang or refuse.
  function notSaved(reason, text) {
    const why = NOT_SAVED_WHY[reason] || "the store refused the write";
    const attempt = attempts;
    status(`Not saved: ${why}. Copy the answers from the box and paste them in chat.`);
    showBox(text);
    copy(text).then((copied) => {
      if (copied && attempt === attempts) status(`Not saved: ${why}. Answers copied: paste them in chat.`);
    });
    return { state: "not_saved", reason };
  }
  const notSentLine = (round, why) =>
    `Saved (round ${round}), not sent: ${NOT_SENT_WHY[why] || "Claude could not be reached"}. ${IN_CHAT}`;

  function serialise(input) {
    return JSON.parse(JSON.stringify({
      title: input.title === undefined ? "" : String(input.title),
      items: Array.isArray(input.items) ? input.items : [],
      text: input.text,
      data: input.data,
    }));
  }
  function fallbackText(input) {
    if (input.text) return String(input.text);
    try { return JSON.stringify({ title: input.title, items: input.items, data: input.data }, null, 2); }
    catch (e) { return String(input.title || ""); }
  }

  async function run(input) {
    const element = anchorElement(input.anchor);
    await null; // a page's own synchronous status write lands first, then is replaced
    attempts += 1;
    status("Saving...");
    const text = fallbackText(input);
    const db = await use("db");
    if (!db) return notSaved("no_db", text);
    const who = await viewer();
    if (who.canWrite === false) return notSaved("read_only", text);

    let doc;
    try { doc = serialise(input); } catch (e) { return notSaved("invalid_payload", text); }
    if (new TextEncoder().encode(JSON.stringify(doc)).length > MAX_DOC_BYTES - 4096) return notSaved("too_large", text);

    const wake = prepareWake(element);
    const round = await nextRound(db);
    const id = `r${String(round).padStart(4, "0")}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const path = `answers/${id}`;
    Object.assign(doc, {
      round,
      submittedAt: new Date().toISOString(),
      itemCount: doc.items.length,
      changedCount: doc.items.filter(isChanged).length,
      viewerId: who.id,
      owner: who.owner,
    });
    const landed = () => { knownRound = Math.max(knownRound, round); lastSent = doc; };

    let writing;
    try {
      writing = db.doc(path).set(doc);
      await timed(writing);
    } catch (e) {
      const reason = codeOf(e);
      if (reason === "timeout") {
        writing.then(() => { landed(); status(notSentLine(round, "late")); }, () => {});
      }
      return notSaved(reason, text);
    }
    landed();
    if (box) { box.remove(); box = null; }

    status(`Saved (round ${round}). Telling Claude...`);
    const waiting = setTimeout(() => {
      status(`Saved (round ${round}). Still waiting on the comment prompt. If it is gone: ${IN_CHAT}`);
    }, TIMEOUT_MS); // consent may stay open as long as the viewer takes, so this only informs
    const why = await sendWake(await wake,
      `Decision answers saved as ${path}: round ${round}, ${doc.itemCount} items, ${doc.changedCount} changed or noted. Read the document; this comment holds no answers.`);
    clearTimeout(waiting);
    if (why) {
      status(notSentLine(round, why));
      return { state: "saved", doc: path, round, reason: why };
    }
    status(`Saved and sent (round ${round}). You can resubmit; the latest round wins.`);
    return { state: "sent", doc: path, round };
  }

  function submit(input) {
    if (inFlight) return inFlight;
    inFlight = run(input || {}).finally(() => { inFlight = null; });
    return inFlight;
  }

  function markEnded() {
    if (!endButton) return;
    endButton.disabled = true;
    endButton.textContent = "Review ended";
  }
  async function endReview() {
    const element = anchorElement();
    const refused = (reason) => {
      status(`Review not ended: ${NOT_SAVED_WHY[reason] || "the store refused the write"}. Say so in chat.`);
      return { state: "not_saved", reason };
    };
    const db = await use("db");
    if (!db) return refused("no_db");
    const who = await viewer();
    if (who.canWrite === false) return refused("read_only");
    const wake = prepareWake(element);
    try {
      await timed(db.doc(REVIEW_DOC).set({ ended: true, endedAt: new Date().toISOString(), viewerId: who.id, owner: who.owner }));
    } catch (e) { return refused(codeOf(e)); }
    markEnded();
    const why = await sendWake(await wake, `Review ended, recorded at ${REVIEW_DOC}.`);
    status(why ? 'Review ended, not sent. Say "review ended" in chat.' : "Review ended. Claude has been told.");
    return why ? { state: "ended", reason: why } : { state: "ended" };
  }

  function button(label, host) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    const model = host.querySelector("button:not(.primary)");
    if (model) b.className = model.className;
    host.insertBefore(b, host.querySelector(".primary"));
    return b;
  }
  function mountEndReview() {
    let armed = false;
    let timer = null;
    endButton = button("End review", controls());
    endButton.addEventListener("click", async () => {
      if (!armed) {
        armed = true;
        endButton.textContent = "Confirm end review";
        timer = setTimeout(() => { armed = false; endButton.textContent = "End review"; }, CONFIRM_MS);
        return;
      }
      clearTimeout(timer);
      armed = false;
      endButton.disabled = true;
      endButton.textContent = "Ending...";
      const r = await endReview();
      if (r.state !== "ended") { endButton.disabled = false; endButton.textContent = "End review"; }
    });
  }

  async function init() {
    const db = await use("db");
    if (!db) return;
    if (tag && tag.hasAttribute("data-end-review")) {
      mountEndReview();
      try {
        const snap = await timed(db.doc(REVIEW_DOC).get());
        if (snap.exists && snap.data().ended === true) markEnded();
      } catch (e) { /* an unreadable store leaves the control live */ }
    }
    const doc = await latest();
    if (!doc || attempts) return;
    knownRound = Math.max(knownRound, Number(doc.round) || 0);
    lastSent = doc;
    const when = new Date(doc.submittedAt).toLocaleString();
    status(`Last sent: round ${doc.round}, ${when}, ${doc.itemCount} items, ${doc.changedCount} changed or noted.`);
    button("Show what was sent", controls()).addEventListener("click", () => {
      showBox(lastSent.text || JSON.stringify({ items: lastSent.items, data: lastSent.data }, null, 2));
    });
  }

  const draftKey = () => "decision-kit:draft:" + location.pathname;
  function saveDraft(value) {
    try { localStorage.setItem(draftKey(), JSON.stringify(value)); } catch (e) { /* per-viewer convenience only */ }
  }
  function loadDraft() {
    try { return JSON.parse(localStorage.getItem(draftKey())); } catch (e) { return null; }
  }

  window.decisionPage = { submit, endReview, latest, saveDraft, loadDraft };

  // Pages written for lavish submit unchanged. queuePrompt does the whole submit, so a
  // page with a separate Send step needs none here, and the press stays the gesture.
  if (!realLavish && window.claude) {
    window.lavish = {
      queuePrompt(text, opts) {
        const o = opts || {};
        const data = o.data || {};
        return submit({ title: o.text || o.tag || "", text, items: data.items, data, anchor: o.element });
      },
      sendQueuedPrompts() {},
    };
  }

  if (window.claude && !realLavish) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
  }
})();
