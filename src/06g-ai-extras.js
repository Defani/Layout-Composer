// ---------------------------------------------------------------- AI chat extras
// Quick replies under the last answer, a glow on the item the AI is working
// on, a version history saved around AI edits, export result cards and a
// soft sound when the AI finishes.

AI.local = []; // cards that live only in this view (exports): { at, ...data }
AI.chips = null; // quick replies suggested by the AI (window.LayoutComposer.ai.suggest)
AI.lastDoneKey = null;
const AI_SOUND_KEY = "glc:aisound";
try {
  AI.sound = localStorage.getItem(AI_SOUND_KEY) !== "off";
} catch {
  AI.sound = true;
}

// A fresh chat for each time the composer opens: messages already in the
// bridge log at that moment stay out of this view (the log keeps the same
// message objects between snapshots, so a WeakSet marks them).
function aiNewSession() {
  AI.fresh = true;
  AI.seen = null;
  AI.local = [];
  AI.chips = null;
  AI.lastDoneKey = null;
  aiShowVersions(false);
}

// ---- 1. quick replies
function aiSendText(text) {
  if (!AI.input) return;
  AI.input.value = text;
  aiSend();
}

function aiQuickReplies() {
  const chip = (label, fn, cls = "") => el("button", { type: "button", class: `${NS}-aichip ${cls}`, onclick: fn }, label);
  const own = (AI.chips || []).map((t) => chip(t, () => aiSendText(t), "ai"));
  return el("div", { class: `${NS}-aichips` },
    ...own,
    chip("Undo", () => {
      undo();
      toast("Last change undone");
    }),
    chip("Export…", () => openExportDialog()),
    chip("Versions", () => aiShowVersions(true)),
    chip("Looks good 👍", () => aiSendText("Looks good, thanks!"), "ok"),
  );
}

// ---- 5. glow on the item being worked on
function aiGlow(r) {
  if (!S.ui.paper || !r) return;
  let g = AIC.glow;
  if (!g?.isConnected) {
    g = el("div", { class: `${NS}-aiglow` });
    S.ui.paper.append(g);
    AIC.glow = g;
  }
  const Z = S.zoom;
  clearTimeout(AIC.glowOff);
  Object.assign(g.style, { left: `${r.x * Z}px`, top: `${r.y * Z}px`, width: `${r.w * Z}px`, height: `${r.h * Z}px` });
  g.classList.add("on");
}
function aiGlowOff() {
  clearTimeout(AIC.glowOff);
  AIC.glowOff = setTimeout(() => AIC.glow?.classList.remove("on"), 900);
}

// ---- 6. version history (IndexedDB). Large data: URIs (map captures, logos)
// are stored once in a separate store and referenced by hash.
const AIV = { db: null, last: {} };
const AIV_TOKEN = "glcblob:";
const AIV_KEEP = 30;

function aivDb() {
  if (AIV.db) return AIV.db;
  AIV.db = new Promise((resolve, reject) => {
    const req = indexedDB.open("glc-ai-versions", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore("versions", { keyPath: "id" }).createIndex("layout", "layout");
      db.createObjectStore("blobs");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return AIV.db;
}
const aivReq = (r) => new Promise((resolve, reject) => {
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
});
async function aivHash(str) {
  const d = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(str));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Capture now (synchronously), store in the background.
function aiSaveVersion(label) {
  if (!S.doc) return Promise.resolve();
  const doc = S.doc;
  const json = JSON.stringify(doc);
  let svg = "";
  try {
    svg = composePageSVG(new Map());
  } catch {}
  const run = async () => {
    const hash = await aivHash(json);
    if (AIV.last[doc.id] === hash) return;
    const big = [];
    JSON.parse(json, (k, v) => {
      if (typeof v === "string" && v.length > 20000) big.push(v);
      return v;
    });
    const refs = new Map();
    for (const s of big) if (!refs.has(s)) refs.set(s, await aivHash(s));
    const slim = refs.size ? JSON.stringify(JSON.parse(json), (k, v) => (typeof v === "string" && refs.has(v) ? AIV_TOKEN + refs.get(v) : v)) : json;
    let thumb = "";
    try {
      if (svg) thumb = (await rasterize(svg, 20, "#ffffff")).toDataURL("image/jpeg", 0.75);
    } catch {}
    const db = await aivDb();
    const tx = db.transaction(["versions", "blobs"], "readwrite");
    for (const [s, h] of refs) tx.objectStore("blobs").put(s, h);
    tx.objectStore("versions").put({ id: uid("v"), layout: doc.id, name: doc.name, time: Date.now(), label: String(label || "Version").slice(0, 120), thumb, doc: slim, hash });
    await new Promise((r, j) => {
      tx.oncomplete = r;
      tx.onerror = () => j(tx.error);
    });
    AIV.last[doc.id] = hash;
    await aivPrune(doc.id);
    if (AI.el?.classList.contains("showv")) aiRenderVersions();
  };
  return run().catch((e) => console.warn("[Layout Composer] version save failed", e));
}

async function aivList(layoutId) {
  const db = await aivDb();
  const all = await aivReq(db.transaction("versions").objectStore("versions").index("layout").getAll(layoutId));
  return all.sort((a, b) => b.time - a.time);
}

async function aivPrune(layoutId) {
  const list = await aivList(layoutId);
  if (list.length <= AIV_KEEP) return;
  const db = await aivDb();
  const tx = db.transaction(["versions", "blobs"], "readwrite");
  for (const v of list.slice(AIV_KEEP)) tx.objectStore("versions").delete(v.id);
  // drop blobs no remaining version refers to
  const all = await aivReq(tx.objectStore("versions").getAll());
  const used = new Set();
  const re = new RegExp(`${AIV_TOKEN}([0-9a-f]{40})`, "g");
  for (const v of all) for (const m of v.doc.matchAll(re)) used.add(m[1]);
  const keys = await aivReq(tx.objectStore("blobs").getAllKeys());
  for (const k of keys) if (!used.has(k)) tx.objectStore("blobs").delete(k);
}

async function aiRestoreVersion(v) {
  const db = await aivDb();
  const store = db.transaction("blobs").objectStore("blobs");
  const re = new RegExp(`${AIV_TOKEN}([0-9a-f]{40})`, "g");
  const blobs = new Map();
  for (const m of v.doc.matchAll(re)) if (!blobs.has(m[1])) blobs.set(m[1], await aivReq(store.get(m[1])));
  const doc = JSON.parse(v.doc, (k, val) => (typeof val === "string" && val.startsWith(AIV_TOKEN) ? blobs.get(val.slice(AIV_TOKEN.length)) ?? "" : val));
  pushHistory();
  S.doc = doc;
  S.selection = [];
  afterDocReplaced();
  saveLibrary();
  toast("Version restored — Ctrl+Z goes back");
}

function aiShowVersions(show) {
  AI.el?.classList.toggle("showv", show);
  AI.el?.querySelector(`.${NS}-aihist`)?.classList.toggle("on", show);
  if (show) {
    if (!AI.open) setAiOpen(true);
    aiRenderVersions();
  }
}

async function aiRenderVersions() {
  const host = AI.vlist;
  if (!host || !S.doc) return;
  let list = [];
  try {
    list = await aivList(S.doc.id);
  } catch (e) {
    host.replaceChildren(el("p", { class: `${NS}-muted` }, `Version history is not available here (${e.message}).`));
    return;
  }
  const when = (t) => new Date(t).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  host.replaceChildren(
    el("div", { class: `${NS}-avhead` },
      el("b", {}, "Versions"),
      el("span", { class: `${NS}-muted` }, "Saved around each AI edit"),
      el("button", { type: "button", class: `${NS}-aichip`, onclick: () => aiSaveVersion("Saved by hand") }, "Save now"),
      el("button", { type: "button", class: `${NS}-aichip`, onclick: () => aiShowVersions(false) }, "Back to chat"),
    ),
    list.length
      ? el("div", { class: `${NS}-avgrid` }, ...list.map((v, i) => el("button", { type: "button", class: `${NS}-avcard`, title: "Restore this version", onclick: () => aiRestoreVersion(v) },
        v.thumb ? el("img", { src: v.thumb, alt: "" }) : el("div", { class: `${NS}-avblank` }),
        el("span", { class: `${NS}-avlabel` }, v.label),
        el("small", {}, `${when(v.time)}${i === 0 ? " · latest" : ""}`),
      )))
      : el("p", { class: `${NS}-muted` }, "No versions yet. One is saved before and after each AI edit."),
  );
}

// AI edit started / finished (from aiWorking)
function aiVersionHook(busy) {
  if (busy) {
    clearTimeout(AIV.afterTimer);
    if (!AIV.inEdit) {
      AIV.inEdit = true;
      aiSaveVersion("Before AI edits");
    }
  } else {
    clearTimeout(AIV.afterTimer);
    AIV.afterTimer = setTimeout(() => {
      if (AIC.busy) return;
      AIV.inEdit = false;
      const lastUser = [...(AI.snap?.history || [])].reverse().find((m) => m.role === "user" && m.via === AI_SOURCE);
      aiSaveVersion(lastUser ? lastUser.text : "AI edit");
    }, 1800);
  }
}

// ---- 7. export cards
function aiExportCard(svg, fmt) {
  const dl = S.lastDownload;
  if (!dl || Date.now() - dl.time > 15000) return;
  const msgs = (AI.snap?.history || []).filter((m) => m.via === AI_SOURCE);
  const card = { kind: "export", at: msgs.length, fmt, filename: dl.filename, size: dl.blob.size, type: dl.blob.type, url: URL.createObjectURL(dl.blob), blob: dl.blob, thumb: "", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
  AI.local.push(card);
  renderAiChat();
  rasterize(svg, 24, "#ffffff")
    .then((c) => {
      card.thumb = c.toDataURL("image/jpeg", 0.8);
      renderAiChat();
    })
    .catch(() => {});
}

function aiExportBubble(c) {
  const kb = c.size > 1048576 ? `${(c.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(c.size / 1024))} KB`;
  return el("div", { class: `${NS}-aimsg ai ${NS}-aiexport` },
    el("div", { class: `${NS}-aitext` }, el("b", {}, "Export finished")),
    el("button", { type: "button", class: `${NS}-aexthumb`, title: "Preview", onclick: () => aiPreview(c) }, c.thumb ? el("img", { src: c.thumb, alt: "" }) : el("i", { class: `${NS}-aispin` })),
    el("div", { class: `${NS}-aexfile` }, el("span", {}, c.filename), el("small", {}, `${String(c.fmt || "").toUpperCase()} · ${kb} · saved to your Downloads folder`)),
    el("div", { class: `${NS}-aichips` },
      el("button", { type: "button", class: `${NS}-aichip`, onclick: () => aiPreview(c) }, "Preview"),
      el("button", { type: "button", class: `${NS}-aichip`, onclick: () => downloadBlob(c.blob, c.filename) }, "Download again"),
    ),
    el("small", {}, c.time),
  );
}

function aiPreview(c) {
  const close = () => box.remove();
  const isPdf = /pdf/.test(c.type);
  const media = isPdf ? el("iframe", { src: c.url, title: c.filename }) : el("img", { src: c.url, alt: c.filename });
  const box = el("div", { class: `${NS}-aiprev`, onclick: (e) => e.target === box && close() },
    el("div", { class: `${NS}-aiprevin` },
      el("div", { class: `${NS}-aiprevhead` }, el("b", {}, c.filename), iconBtn("close", "Close", close)),
      media,
    ),
  );
  box.tabIndex = -1;
  box.addEventListener("keydown", (e) => e.key === "Escape" && close());
  S.ui.root.append(box);
  box.focus();
}

// ---- 8. sound when the AI finishes
function aiDing() {
  if (!AI.sound) return;
  try {
    const ctx = (AIC.audio ||= new (window.AudioContext || window.webkitAudioContext)());
    const t = ctx.currentTime;
    for (const [f, d] of [[880, 0], [1320, 0.09]]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.exponentialRampToValueAtTime(0.07, t + d + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(t + d);
      o.stop(t + d + 0.4);
    }
  } catch {}
}

function aiSetSound(on) {
  AI.sound = on;
  try {
    localStorage.setItem(AI_SOUND_KEY, on ? "on" : "off");
  } catch {}
  const b = AI.el?.querySelector(`.${NS}-aisound`);
  if (b) {
    b.innerHTML = icon(on ? "bell" : "belloff", 15);
    b.title = on ? "Sound on (click to mute)" : "Sound off (click to unmute)";
  }
}

// Ding once per finished answer, never for answers already there on open.
function aiDoneCheck(msgs) {
  const last = [...msgs].reverse().find((m) => m.role !== "user" && m.role !== "system");
  const key = last && last.status !== "working" ? `${msgs.indexOf(last)}|${last.time}|${(last.text || "").length}` : AI.lastDoneKey;
  if (AI.lastDoneKey !== null && key !== AI.lastDoneKey && last?.status === "done") aiDing();
  AI.lastDoneKey = key ?? "";
}
