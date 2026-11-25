// Run with: node --test decision-kit.test.mjs
// The fake `claude` mirrors the shapes in the artifact runtime contract 0.2.96
// (db, comments, user). Tests assert stored data and what the viewer reads.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const KIT = readFileSync(new URL("./decision-kit.js", import.meta.url), "utf8");
const NOTE = "SENTINEL-NOTE-keep-out-of-comments";
const NAME = "SENTINEL-VIEWER-NAME";
const MAIL = "SENTINEL-VIEWER-MAIL";
const err = (code) => ({ code, message: code });
const flush = async () => { for (let i = 0; i < 12; i += 1) await new Promise((r) => setImmediate(r)); };

/* ---------- fake DOM: only what a page and the kit touch ---------- */
class El {
  constructor(tag, doc) { this.tagName = tag.toUpperCase(); this.doc = doc; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.id = ""; this.className = ""; this.textContent = ""; this.value = ""; this.style = {}; this.disabled = false; this.hidden = false; }
  set innerHTML(_) { throw new Error("the kit must not parse viewer data as HTML"); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  hasAttribute(k) { return k in this.attrs; }
  appendChild(c) { return this.insertBefore(c, null); }
  insertBefore(c, ref) { c.remove(); c.parent = this; const i = ref ? this.children.indexOf(ref) : -1; if (i < 0) this.children.push(c); else this.children.splice(i, 0, c); return c; }
  remove() { if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = null; }
  get isConnected() { let n = this; while (n.parent) n = n.parent; return n === this.doc.body; }
  contains(o) { for (let n = o; n; n = n.parent) if (n === this) return true; return false; }
  matches(tok) {
    return tok.split(",").some((t) => {
      const not = /:not\(\.([\w-]+)\)/.exec(t); const base = t.replace(/:not\([^)]*\)/, "").trim();
      if (not && this.className.split(" ").includes(not[1])) return false;
      const byAttr = /^\[([\w-]+)=([\w-]+)\]$/.exec(base);
      if (byAttr) return this.getAttribute(byAttr[1]) === byAttr[2];
      if (base.startsWith("#")) return this.id === base.slice(1);
      if (base.startsWith(".")) return this.className.split(" ").includes(base.slice(1));
      return this.tagName === base.toUpperCase();
    });
  }
  closest(sel) { for (let n = this; n; n = n.parent) if (n.matches(sel)) return n; return null; }
  all() { return this.children.flatMap((c) => [c, ...c.all()]); }
  querySelector(sel) {
    const toks = sel.split(" "); let scope = [this];
    for (const tok of toks) scope = scope.flatMap((s) => s.all().filter((e) => e.matches(tok)));
    return scope[0] ?? null;
  }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  focus() {} select() {}
  click() {
    const ev = { type: "click", target: this };
    (this.doc.captureListeners.click || []).forEach((f) => f(ev));
    for (let n = this; n; n = n.parent) (n.listeners.click || []).forEach((f) => f(ev));
  }
}

function page(attrs = {}) {
  const doc = { captureListeners: {}, readyState: "complete", listeners: {} };
  doc.createElement = (t) => new El(t, doc);
  doc.body = new El("body", doc);
  doc.querySelector = (s) => doc.body.querySelector(s);
  doc.getElementById = (id) => doc.body.querySelector("#" + id);
  doc.addEventListener = (t, f, capture) => { ((capture ? doc.captureListeners : doc.listeners)[t] ||= []).push(f); };
  const add = (parent, tag, id, cls = "") => { const e = new El(tag, doc); e.id = id; e.className = cls; parent.appendChild(e); return e; };
  const bar = add(doc.body, "div", "submitBar", "bar");
  const inner = add(bar, "div", "", "in");
  const status = add(inner, "span", "barStatus"); status.textContent = "initial page text";
  status.setAttribute("role", "status");
  add(inner, "button", "resetBtn", "btn");
  const submit = add(inner, "button", "submitBtn", "btn primary");
  const script = new El("script", doc);
  Object.entries({ "data-status": "#barStatus", "data-controls": "#submitBar .in", ...attrs }).forEach(([k, v]) => { if (v !== null) script.setAttribute(k, v); });
  doc.currentScript = script;
  return { doc, status, submit, inner };
}

/* ---------- fake runtime, from the .d.ts shapes ---------- */
function makeDb(store, ctl) {
  const SEG = /^[A-Za-z0-9_\-.~:@+]+$/;
  const check = (path, parity) => {
    const segs = path.split("/");
    if (!segs.every((s) => SEG.test(s)) || segs.length % 2 !== parity) throw new TypeError("bad path " + path);
  };
  const meta = { fromCache: false, hasPendingWrites: false };
  const snap = (path) => { const body = store.get(path); return Object.freeze({ id: path.split("/").pop(), exists: !!body, data: () => body, metadata: meta }); };
  const write = (path, data) => {
    const json = JSON.stringify(data);
    if (Buffer.byteLength(json) > 256 * 1024) return Promise.reject(err("invalid_argument"));
    store.set(path, Object.freeze(JSON.parse(json)));
    return Promise.resolve();
  };
  const doc = (path) => {
    check(path, 0);
    return {
      id: path.split("/").pop(), path,
      get: () => (ctl.failGet ? Promise.reject(err(ctl.failGet)) : ctl.holdGet ? new Promise(() => {}) : Promise.resolve(snap(path))),
      set(data) {
        const once = ctl.failSetOnce; ctl.failSetOnce = null;
        if (once || ctl.failSet) return Promise.reject(err(once || ctl.failSet));
        if (ctl.holdSet) return new Promise((res) => { ctl.releaseSet = () => write(path, data).then(res); });
        return write(path, data);
      },
    };
  };
  const query = (coll, field, dir, n) => ({
    orderBy: (f, d = "asc") => query(coll, f, d, n),
    limit: (k) => query(coll, field, dir, k),
    get() {
      if (ctl.failGet) return Promise.reject(err(ctl.failGet));
      if (ctl.holdGet) return new Promise(() => {});
      let paths = [...store.keys()].filter((p) => p.startsWith(coll + "/") && p.split("/").length === coll.split("/").length + 1).sort();
      if (field) paths.sort((a, b) => (store.get(a)[field] - store.get(b)[field]) * (dir === "desc" ? -1 : 1));
      if (n) paths = paths.slice(0, n);
      const docs = paths.map(snap);
      return Promise.resolve({ docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: meta });
    },
  });
  return Object.freeze({
    doc,
    collection(path) { check(path, 1); return { path, ...query(path), doc: (id) => doc(path + "/" + (id ?? "gen" + store.size)) }; },
  });
}

function makeComments(ctl) {
  return Object.freeze({
    anchorFor: (el) => (el.isConnected ? Promise.resolve({ path: el.id, x: 1, y: 2 }) : Promise.reject(err("invalid"))),
    canSendToClaude: () => (ctl.canRejects ? Promise.reject(err(ctl.canRejects)) : Promise.resolve(ctl.can ?? "available")),
    sendToClaude(target) {
      const once = ctl.failSendOnce; ctl.failSendOnce = null;
      if (once || ctl.failSend) return Promise.reject(err(once || ctl.failSend));
      if (("anchor" in target) === ("threadId" in target) || !target.text.trim() || Buffer.byteLength(target.text) > 4096) return Promise.reject(err("invalid"));
      const post = () => { ctl.posted.push(target); return { threadId: "t1", commentId: "c1" }; };
      if (ctl.holdSend) return new Promise((res, rej) => { ctl.settleSend = (code) => (code ? rej(err(code)) : res(post())); });
      return Promise.resolve(post());
    },
  });
}

function makeUser(ctl) {
  const me = { id: ctl.signedOut ? null : "u_viewer", name: NAME, email: MAIL, avatarUrl: "data:,", color: "#000", isOwner: ctl.owner ?? true, canEdit: true };
  return Object.freeze({
    me: () => Promise.resolve(me), id: () => Promise.resolve(me.id), isOwner: () => Promise.resolve(me.isOwner), canEdit: () => Promise.resolve(true),
    can: () => Promise.resolve(ctl.canWrite === undefined ? true : ctl.canWrite),
  });
}

function boot(opts = {}) {
  const { store = new Map(), claude = true, lavish, attrs, caps = {}, storageThrows = false, clipboard = "ok" } = opts;
  const ctl = { posted: [], ...opts.ctl };
  const { doc, status, submit, inner } = page(attrs);
  const timers = [];
  let now = 0;
  const clock = {
    setTimeout: (f, ms) => { timers.push({ f, at: now + ms }); return timers.length; },
    clearTimeout: (i) => { if (timers[i - 1]) timers[i - 1].f = null; },
    async tick(ms) { now += ms; for (const t of timers) if (t.f && t.at <= now) { const f = t.f; t.f = null; f(); } await flush(); },
  };
  const namespaces = { db: makeDb(store, ctl), comments: makeComments(ctl), user: makeUser(ctl), ...caps };
  const clip = { text: null };
  const mem = new Map();
  const storage = { getItem(k) { if (storageThrows) throw new Error("denied"); return mem.get(k) ?? null; }, setItem(k, v) { if (storageThrows) throw new Error("denied"); mem.set(k, v); } };
  const sandbox = {
    document: doc, setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout, TextEncoder, console,
    localStorage: storage, location: { pathname: "/page" },
    navigator: clipboard === "absent" ? {} : { clipboard: { writeText: (t) => { if (clipboard === "hang") return new Promise(() => {}); if (clipboard === "denied") return Promise.reject(new Error("denied")); clip.text = t; return Promise.resolve(); } } },
  };
  sandbox.window = sandbox;
  if (lavish) sandbox.lavish = lavish;
  if (claude) sandbox.claude = opts.use ? { use: (n) => opts.use(n, clock) } : { use: (n) => Promise.resolve(namespaces[n] ?? null) };
  vm.createContext(sandbox);
  vm.runInContext(KIT, sandbox);
  return { window: sandbox, doc, status, submit, inner, store, ctl, clock, clip };
}

const ready = async (o) => { const e = boot(o); await flush(); return e; };
const answers = (store) => [...store.entries()].filter(([k]) => k.startsWith("answers/"));
const payload = (over = {}) => ({
  title: "Design pass",
  text: "Q1 a\nQ2 b note: " + NOTE,
  items: [{ id: "Q1", pick: "a", recommended: "a", note: "" }, { id: "Q2", pick: "b", recommended: "a", note: NOTE }, { id: "Q3", answer: "a", recommended: "a", asRecommended: true, note: "" }],
  data: { anythingElse: NOTE },
  ...over,
});
const press = async (e, fn) => { e.submit.listeners.click = [fn]; e.submit.click(); await flush(); };
const submitNow = async (e, p = payload()) => { let r; await press(e, () => { r = e.window.decisionPage.submit(p); }); return r; };
// For a submit that stays pending: the wrapper keeps an async return from waiting on it.
const submitHeld = async (e, p = payload()) => { let r; await press(e, () => { r = e.window.decisionPage.submit(p); }); return [r]; };

/* ---------- submit: the document ---------- */
test("submit writes answers/<id> with the payload, a time and a round", async () => {
  const e = await ready();
  const r = await submitNow(e);
  const [[path, doc]] = answers(e.store);
  assert.equal(r.state, "sent");
  assert.equal(r.doc, path);
  assert.match(path, /^answers\/[A-Za-z0-9_\-.~:@+]+$/);
  assert.equal(doc.title, "Design pass");
  assert.deepEqual(doc.items, payload().items);
  assert.equal(doc.text, payload().text);
  assert.deepEqual(doc.data, payload().data);
  assert.equal(doc.round, 1);
  assert.ok(!Number.isNaN(Date.parse(doc.submittedAt)));
  assert.equal(doc.itemCount, 3);
  assert.equal(doc.changedCount, 1);
});

test("the document records the viewer as an opaque id and an owner flag, never a name or an address", async () => {
  const e = await ready({ ctl: { owner: true } });
  await submitNow(e);
  const [[, doc]] = answers(e.store);
  assert.equal(doc.viewerId, "u_viewer");
  assert.equal(doc.owner, true);
  const raw = JSON.stringify(doc);
  assert.ok(!raw.includes(NAME) && !raw.includes(MAIL));
  const guest = await ready({ ctl: { owner: false } });
  await submitNow(guest);
  assert.equal(answers(guest.store)[0][1].owner, false);
});

test("round increases, every round is a new document, and earlier rounds stay", async () => {
  const e = await ready();
  await submitNow(e);
  await submitNow(e, payload({ title: "second" }));
  const docs = answers(e.store).map(([, d]) => d).sort((a, b) => a.round - b.round);
  assert.deepEqual(docs.map((d) => d.round), [1, 2]);
  assert.deepEqual(docs.map((d) => d.title), ["Design pass", "second"]);
});

test("a second device continues the round sequence without overwriting the first", async () => {
  const store = new Map();
  const phone = await ready({ store });
  const laptop = await ready({ store }); // loaded before the phone submitted
  await submitNow(phone);
  await submitNow(laptop);
  assert.deepEqual(answers(store).map(([, d]) => d.round).sort(), [1, 2]);
});

test("a double press while a submit is in flight writes one document", async () => {
  const e = await ready({ ctl: { holdSend: true } });
  await press(e, () => { e.window.decisionPage.submit(payload()); e.window.decisionPage.submit(payload()); });
  assert.equal(answers(e.store).length, 1);
});

test("a payload that cannot be serialised is not saved and the page says so", async () => {
  const e = await ready();
  const data = {}; data.self = data;
  const r = await submitNow(e, payload({ data }));
  assert.equal((await r).state, "not_saved");
  assert.equal(answers(e.store).length, 0);
  assert.match(e.status.textContent, /^Not saved/);
});

test("a payload over the 256 KiB document cap is not saved and is kept for copying", async () => {
  const e = await ready();
  const text = "x".repeat(300 * 1024);
  const r = await (await submitNow(e, payload({ text })));
  assert.equal(r.state, "not_saved");
  assert.equal(e.clip.text, text);
  assert.equal(e.ctl.posted.length, 0);
});

/* ---------- submit: the wake comment ---------- */
test("the comment names the doc and the counts, and carries no payload", async () => {
  const e = await ready();
  const r = await (await submitNow(e));
  const [c] = e.ctl.posted;
  assert.ok(c.text.includes(r.doc));
  assert.match(c.text, /3 items/);
  assert.match(c.text, /1 changed/);
  for (const secret of [NOTE, "Design pass", "Q1 a", '"pick"']) assert.ok(!c.text.includes(secret), secret);
  assert.ok(Buffer.byteLength(c.text) < 300);
});

test("the comment is anchored at the control the viewer pressed", async () => {
  const e = await ready();
  await submitNow(e);
  assert.equal(e.ctl.posted[0].anchor.path, "submitBtn");
});

test("saved and sent is reported plainly", async () => {
  const e = await ready();
  await submitNow(e);
  assert.match(e.status.textContent, /^Saved and sent/);
  assert.match(e.status.textContent, /round 1/);
});

for (const code of ["consent_required", "forbidden", "claude_unavailable", "rate_limited", "capability_removed", "unavailable", "upstream_error", "invalid", "not_granted", "capability_disabled", "something_new"]) {
  test(`sendToClaude rejecting ${code} keeps the save and tells the viewer to say so in chat`, async () => {
    const e = await ready({ ctl: { failSend: code } });
    const r = await (await submitNow(e));
    assert.equal(r.state, "saved");
    assert.equal(r.reason, code);
    assert.deepEqual(answers(e.store)[0][1].items, payload().items);
    assert.match(e.status.textContent, /^Saved \(round 1\), not sent/);
    assert.match(e.status.textContent, /in chat/);
    assert.equal(e.ctl.posted.length, 0);
  });
}

for (const can of ["writers_only", "no_session", "off", "future_value"]) {
  test(`canSendToClaude "${can}" saves and posts nothing`, async () => {
    const e = await ready({ ctl: { can } });
    const r = await (await submitNow(e));
    assert.equal(r.state, "saved");
    assert.equal(e.ctl.posted.length, 0);
    assert.equal(answers(e.store).length, 1);
    assert.match(e.status.textContent, /in chat/);
  });
}

test("canSendToClaude rejecting capability_removed saves and posts nothing", async () => {
  const e = await ready({ ctl: { canRejects: "capability_removed" } });
  const r = await (await submitNow(e));
  assert.equal(r.state, "saved");
  assert.equal(answers(e.store).length, 1);
});

test("use(comments) resolving null saves and reports not sent", async () => {
  const e = await ready({ caps: { comments: null } });
  const r = await (await submitNow(e));
  assert.equal(r.state, "saved");
  assert.equal(answers(e.store).length, 1);
  assert.match(e.status.textContent, /not sent/);
});

test("a held consent prompt shows the save first and settles when the viewer decides", async () => {
  const e = await ready({ ctl: { holdSend: true } });
  const [r] = await submitHeld(e);
  assert.equal(answers(e.store).length, 1);
  assert.match(e.status.textContent, /^Saved/);
  await e.clock.tick(10000);
  assert.match(e.status.textContent, /^Saved/);
  assert.match(e.status.textContent, /in chat/);
  e.ctl.settleSend();
  assert.equal((await r).state, "sent");
  await flush();
  assert.match(e.status.textContent, /^Saved and sent/);
});

test("a dismissed consent prompt settles as saved, not sent", async () => {
  const e = await ready({ ctl: { holdSend: true } });
  const [r] = await submitHeld(e);
  e.ctl.settleSend("consent_required");
  assert.equal((await r).state, "saved");
  assert.match(e.status.textContent, /not sent/);
});

test("a refused comment is not retried: a later success stays unposted until a new press", async () => {
  const e = await ready({ ctl: { failSendOnce: "rate_limited" } });
  await submitNow(e);
  await e.clock.tick(60000);
  assert.equal(e.ctl.posted.length, 0);
  await submitNow(e);
  assert.equal(e.ctl.posted.length, 1);
  assert.equal(answers(e.store).length, 2);
});

test("forbidden is permanent for the view: a later press saves and posts nothing", async () => {
  const e = await ready({ ctl: { failSendOnce: "forbidden" } });
  await submitNow(e);
  const r = await (await submitNow(e));
  assert.equal(r.state, "saved");
  assert.equal(r.reason, "forbidden");
  assert.equal(e.ctl.posted.length, 0);
  assert.equal(answers(e.store).length, 2);
});

/* ---------- submit: not saved ---------- */
test("db null: not saved, the text is copied, no comment", async () => {
  const e = await ready({ caps: { db: null } });
  const r = await (await submitNow(e));
  assert.equal(r.state, "not_saved");
  assert.equal(e.clip.text, payload().text);
  assert.equal(e.ctl.posted.length, 0);
  assert.match(e.status.textContent, /^Not saved/);
  assert.match(e.status.textContent, /copied/i);
});

test("use(db) resolving null after the 10 s host timeout reports not saved", async () => {
  const e = boot({ use: (n, clock) => new Promise((res) => clock.setTimeout(() => res(null), 10000)) });
  await flush();
  const [r] = await submitHeld(e);
  assert.match(e.status.textContent, /^Saving/);
  await e.clock.tick(10000);
  assert.equal((await r).state, "not_saved");
  assert.match(e.status.textContent, /^Not saved/);
});

for (const clipboard of ["denied", "absent"]) {
  test(`clipboard ${clipboard}: the answers land in a box to copy by hand`, async () => {
    const e = await ready({ caps: { db: null }, clipboard });
    const r = await (await submitNow(e));
    assert.equal(r.state, "not_saved");
    const box = e.inner.querySelector("textarea");
    assert.equal(box.value, payload().text);
    assert.match(e.status.textContent, /box/);
  });
}

test("a clipboard that never answers: the box and the instruction show at once, and a new press works", async () => {
  const e = await ready({ clipboard: "hang", ctl: { failSetOnce: "unavailable" } });
  await submitNow(e);
  assert.equal(e.inner.querySelector("textarea").value, payload().text);
  assert.match(e.status.textContent, /^Not saved.*box/);
  const r = await (await submitNow(e));
  assert.equal(r.state, "sent");
  assert.equal(answers(e.store).length, 1);
});

test("a late clipboard result never overwrites a newer state", async () => {
  const e = await ready({ clipboard: "ok", ctl: { failSetOnce: "unavailable" } });
  await press(e, () => { e.window.decisionPage.submit(payload()); });
  await submitNow(e);
  assert.match(e.status.textContent, /^Saved and sent/);
});

test("a save clears the fallback box", async () => {
  const e = await ready({ ctl: { failSetOnce: "unavailable" } });
  await submitNow(e);
  assert.ok(e.inner.querySelector("textarea"));
  await submitNow(e);
  assert.equal(e.inner.querySelector("textarea"), null);
});

test("a box the page removed comes back on the next failure", async () => {
  const e = await ready({ caps: { db: null }, clipboard: "denied" });
  await submitNow(e);
  e.inner.querySelector("textarea").remove(); // #119's Copy button removes .manual
  await submitNow(e);
  assert.equal(e.inner.querySelector("textarea").value, payload().text);
});

test("the fallback copies the items when a page gives no text", async () => {
  const e = await ready({ caps: { db: null } });
  await submitNow(e, payload({ text: undefined }));
  assert.ok(e.clip.text.includes(NOTE));
});

for (const code of ["invalid_argument", "resource_exhausted", "quota_exceeded", "unavailable", "revoked", "not_granted", "capability_disabled", "capability_removed", "something_new"]) {
  test(`set rejecting ${code}: not saved, copied, no comment`, async () => {
    const e = await ready({ ctl: { failSet: code } });
    const r = await (await submitNow(e));
    assert.equal(r.state, "not_saved");
    assert.equal(r.reason, code);
    assert.equal(answers(e.store).length, 0);
    assert.equal(e.ctl.posted.length, 0);
    assert.equal(e.clip.text, payload().text);
    assert.match(e.status.textContent, /^Not saved/);
  });
}

test("a rejected write is not retried on its own", async () => {
  const e = await ready({ ctl: { failSetOnce: "unavailable" } });
  await submitNow(e);
  await e.clock.tick(60000);
  assert.equal(answers(e.store).length, 0);
});

test("a press after a failed write saves as a new attempt", async () => {
  const e = await ready({ ctl: { failSetOnce: "unavailable" } });
  await submitNow(e);
  const r = await (await submitNow(e));
  assert.equal(r.state, "sent");
  assert.equal(answers(e.store).length, 1);
});

test("a write with no answer for 10 s reports not saved, then corrects itself if it lands", async () => {
  const e = await ready({ ctl: { holdSet: true } });
  const [r] = await submitHeld(e);
  await e.clock.tick(10000);
  assert.equal((await r).state, "not_saved");
  assert.match(e.status.textContent, /^Not saved/);
  e.ctl.releaseSet();
  await flush();
  assert.equal(answers(e.store).length, 1);
  assert.match(e.status.textContent, /^Saved \(round 1\), not sent/);
  assert.equal(e.ctl.posted.length, 0);
});

test("a round read with no answer for 10 s still writes the answers", async () => {
  const e = await ready({ ctl: {} });
  e.ctl.holdGet = true;
  const [r] = await submitHeld(e);
  await e.clock.tick(10000);
  assert.equal((await r).state, "sent");
  assert.equal(answers(e.store).length, 1);
});

test("a read-only viewer is told, and nothing is written", async () => {
  const e = await ready({ ctl: { canWrite: false } });
  const r = await (await submitNow(e));
  assert.equal(r.state, "not_saved");
  assert.equal(r.reason, "read_only");
  assert.equal(answers(e.store).length, 0);
  assert.match(e.status.textContent, /^Not saved/);
});

test("can(data.write) null lets a refused write decide", async () => {
  const e = await ready({ ctl: { canWrite: null, failSet: "invalid_argument" } });
  const r = await (await submitNow(e));
  assert.equal(r.reason, "invalid_argument");
});

test("signed out: every capability null, the page still hands over the answers", async () => {
  const e = await ready({ caps: { db: null, comments: null, user: null } });
  const r = await (await submitNow(e));
  assert.equal(r.state, "not_saved");
  assert.equal(e.clip.text, payload().text);
});

test("signed out with a db namespace: the refused write is reported, no id is stored", async () => {
  const e = await ready({ ctl: { signedOut: true, failSet: "invalid_argument" } });
  const r = await (await submitNow(e));
  assert.equal(r.state, "not_saved");
  assert.equal(answers(e.store).length, 0);
});

test("user null: the save goes through with no identity and owner false", async () => {
  const e = await ready({ caps: { user: null } });
  await submitNow(e);
  const [[, d]] = answers(e.store);
  assert.equal(d.viewerId, null);
  assert.equal(d.owner, false);
});

/* ---------- end review ---------- */
test("endReview writes review/state with ended true", async () => {
  const e = await ready();
  const r = await e.window.decisionPage.endReview();
  assert.equal(r.state, "ended");
  const d = e.store.get("review/state");
  assert.equal(d.ended, true);
  assert.ok(!Number.isNaN(Date.parse(d.endedAt)));
  assert.equal(d.owner, true);
  assert.ok(!JSON.stringify(d).includes(NAME));
});

test("endReview refused: the state says so and nothing is recorded", async () => {
  const e = await ready({ ctl: { failSet: "revoked" } });
  const r = await e.window.decisionPage.endReview();
  assert.equal(r.state, "not_saved");
  assert.equal(e.store.get("review/state"), undefined);
  assert.match(e.status.textContent, /^Review not ended/);
});

test("endReview with db null reports not ended", async () => {
  const e = await ready({ caps: { db: null } });
  assert.equal((await e.window.decisionPage.endReview()).state, "not_saved");
  assert.match(e.status.textContent, /^Review not ended/);
});

const endBtn = (e) => e.inner.all().find((b) => b.tagName === "BUTTON" && /end review/i.test(b.textContent));

test("no End review control unless the page opts in", async () => {
  assert.equal(endBtn(await ready()), undefined);
});

test("the opted-in control needs a second press, lands before the primary button, takes the page's button class", async () => {
  const e = await ready({ attrs: { "data-end-review": "" } });
  const b = endBtn(e);
  assert.equal(b.className, "btn");
  assert.equal(e.inner.children.indexOf(b), e.inner.children.indexOf(e.submit) - 1);
  b.click(); await flush();
  assert.equal(e.store.get("review/state"), undefined);
  assert.match(b.textContent, /confirm/i);
  b.click(); await flush();
  assert.equal(e.store.get("review/state").ended, true);
  assert.equal(b.disabled, true);
  assert.match(e.status.textContent, /^Review ended/);
});

test("an unconfirmed End review press reverts after 5 s", async () => {
  const e = await ready({ attrs: { "data-end-review": "" } });
  const b = endBtn(e);
  b.click(); await e.clock.tick(5000);
  assert.equal(b.textContent, "End review");
  b.click(); await flush();
  assert.equal(e.store.get("review/state"), undefined);
});

test("ending the review also wakes Claude with no payload; a failed comment leaves it ended", async () => {
  const e = await ready({ attrs: { "data-end-review": "" } });
  const b = endBtn(e); b.click(); await flush(); b.click(); await flush();
  assert.match(e.ctl.posted[0].text, /review\/state/);
  const f = await ready({ attrs: { "data-end-review": "" }, ctl: { failSend: "forbidden" } });
  const c = endBtn(f); c.click(); await flush(); c.click(); await flush();
  assert.equal(f.store.get("review/state").ended, true);
  assert.match(f.status.textContent, /in chat/);
});

test("a review already ended shows as ended on another device", async () => {
  const store = new Map([["review/state", { ended: true, endedAt: "2026-11-07T10:00:00.000Z" }]]);
  const e = await ready({ store, attrs: { "data-end-review": "" } });
  assert.equal(e.inner.all().find((b) => b.tagName === "BUTTON" && /review ended/i.test(b.textContent)).disabled, true);
});

test("no End review control where db cannot run, or outside the viewer", async () => {
  assert.equal(endBtn(await ready({ attrs: { "data-end-review": "" }, caps: { db: null } })), undefined);
  assert.equal(endBtn(await ready({ attrs: { "data-end-review": "" }, claude: false })), undefined);
});

/* ---------- restore ---------- */
const seen = (e) => e.inner.all().find((b) => b.tagName === "BUTTON" && /what was sent/i.test(b.textContent));

test("another device is offered the latest answer, shown as text", async () => {
  const store = new Map();
  const phone = await ready({ store });
  await submitNow(phone, payload({ text: "first" }));
  await submitNow(phone, payload({ text: '<img src=x onerror="alert(1)"> latest' }));
  const laptop = await ready({ store });
  assert.match(laptop.status.textContent, /round 2/);
  assert.match(laptop.status.textContent, /3 items/);
  seen(laptop).click();
  assert.match(laptop.inner.querySelector("textarea").value, /latest$/);
  assert.equal((await laptop.window.decisionPage.latest()).round, 2);
});

test("two docs on the same round resolve by submit time", async () => {
  const store = new Map([
    ["answers/a", { round: 3, submittedAt: "2026-11-07T10:00:00.000Z", text: "older" }],
    ["answers/b", { round: 3, submittedAt: "2026-11-07T11:00:00.000Z", text: "newer" }],
    ["answers/c", { round: 2, submittedAt: "2026-11-07T12:00:00.000Z", text: "lower" }],
  ]);
  const e = await ready({ store });
  assert.equal((await e.window.decisionPage.latest()).text, "newer");
});

test("with nothing sent, or an unreadable store, the page text is left alone", async () => {
  const empty = await ready();
  assert.equal(empty.status.textContent, "initial page text");
  assert.equal(seen(empty), undefined);
  const failing = await ready({ ctl: { failGet: "unavailable" } });
  assert.equal(failing.status.textContent, "initial page text");
  assert.equal(await failing.window.decisionPage.latest(), null);
});

test("a restore read that never answers gives up after 10 s", async () => {
  const e = await ready({ ctl: { holdGet: true } });
  const p = e.window.decisionPage.latest();
  await flush();
  await e.clock.tick(10000);
  assert.equal(await p, null);
});

/* ---------- drafts ---------- */
test("drafts round-trip, and blocked storage is harmless", async () => {
  const e = await ready();
  e.window.decisionPage.saveDraft({ q: 1 });
  assert.equal(e.window.decisionPage.loadDraft().q, 1);
  const blocked = await ready({ storageThrows: true });
  assert.doesNotThrow(() => blocked.window.decisionPage.saveDraft({ q: 1 }));
  assert.equal(blocked.window.decisionPage.loadDraft(), null);
});

/* ---------- lavish adapter ---------- */
// The same order as the real pages: queuePrompt, then a synchronous status write.
const page128 = (e, s = e.status) => () => {
  const L = e.window.lavish;
  L.queuePrompt(payload().text, { tag: "design-pass", text: "#128 design pass", queueKey: "128", element: e.doc.getElementById("submitBar"), data: { items: payload().items, book: [{ id: "B1" }], anythingElse: NOTE } });
  if (typeof L.sendQueuedPrompts === "function") { L.sendQueuedPrompts(); s.textContent = "Sent to the agent."; }
};
const page119 = (e) => () => {
  e.window.lavish.queuePrompt(payload().text, { tag: "decision", text: "#119: T2", queueKey: "119", element: e.doc.getElementById("submitBar"), data: { question: "119", items: payload().items } });
  e.status.textContent = "Queued. Press Send to Agent in the Lavish bar.";
};

test("adapter: a lavish page submits with one press, opts.data lands in the doc, the DOM node does not", async () => {
  const e = await ready();
  await press(e, page128(e));
  const [[path, d]] = answers(e.store);
  assert.deepEqual(d.items, payload().items);
  assert.deepEqual(d.data.book, [{ id: "B1" }]);
  assert.equal(d.data.anythingElse, NOTE);
  assert.equal(d.title, "#128 design pass");
  assert.equal(d.text, payload().text);
  assert.ok(!("element" in d) && !("anchor" in d));
  assert.ok(e.ctl.posted[0].text.includes(path));
  assert.ok(!e.ctl.posted[0].text.includes(NOTE));
});

test("adapter: the queue-only page (#119 shape) sends without any Send step", async () => {
  const e = await ready();
  await press(e, page119(e));
  assert.equal(answers(e.store).length, 1);
  assert.equal(e.ctl.posted.length, 1);
  assert.match(e.status.textContent, /^Saved and sent/);
});

test("adapter: the comment anchors at the pressed button inside opts.element", async () => {
  const e = await ready();
  await press(e, page119(e));
  assert.equal(e.ctl.posted[0].anchor.path, "submitBtn");
});

for (const [name, handler] of [["#128", page128], ["#119", page119]]) {
  test(`adapter: a page's optimistic status (${name}) never survives a failed save`, async () => {
    const e = await ready({ ctl: { failSet: "revoked" } });
    await press(e, handler(e));
    assert.match(e.status.textContent, /^Not saved/);
  });
  test(`adapter: a page's optimistic status (${name}) never survives an unsent comment`, async () => {
    const e = await ready({ ctl: { failSend: "claude_unavailable" } });
    await press(e, handler(e));
    assert.match(e.status.textContent, /^Saved \(round 1\), not sent/);
  });
}

test("adapter: a page's optimistic status is gone while the save is still in flight", async () => {
  const e = await ready({ ctl: { holdSet: true } });
  await press(e, page128(e));
  assert.match(e.status.textContent, /^Saving/);
});

test("with no data-status the kit reports in the page's own role=status element", async () => {
  const e = await ready({ attrs: { "data-status": null } });
  await press(e, page128(e));
  assert.match(e.status.textContent, /^Saved and sent/);
});

test("a page with no status element gets one from the kit", async () => {
  const e = await ready({ attrs: { "data-status": null } });
  e.status.remove();
  await submitNow(e);
  assert.ok(e.doc.body.all().some((n) => n.getAttribute("role") === "status" && /^Saved and sent/.test(n.textContent)));
});

test("adapter: sendQueuedPrompts adds nothing", async () => {
  const e = await ready();
  e.window.lavish.sendQueuedPrompts();
  await flush();
  assert.equal(answers(e.store).length, 0);
});

test("adapter stays out of the way under real lavish", async () => {
  const calls = [];
  const lavish = { queuePrompt: (t) => calls.push(t), sendQueuedPrompts() {} };
  for (const claude of [true, false]) {
    const e = await ready({ lavish, claude });
    assert.equal(e.window.lavish, lavish);
    e.window.lavish.queuePrompt("x");
    await flush();
    assert.equal(answers(e.store).length, 0);
    assert.equal(e.status.textContent, "initial page text");
  }
  assert.equal(calls.length, 2);
});

test("with neither lavish nor claude the page is untouched", async () => {
  const e = await ready({ claude: false, attrs: { "data-end-review": "" } });
  assert.equal(e.window.lavish, undefined);
  assert.equal(e.status.textContent, "initial page text");
  assert.equal(e.doc.body.all().length, page().doc.body.all().length);
});
