// ---------------------------------------------------------------- AI chat bar
// A chat bar under the canvas. Messages go through the Live MCP Bridge plugin
// (window.__geolibreLive), the same chat the AI client reads with chat_wait;
// replies come back to this view because each message carries
// source "layout-composer". Each message also carries a short description of
// the open layout, and window.LayoutComposer.ai lets the AI change it.
// Without the bridge the bar explains how to turn it on; nothing is sent
// anywhere else.

const AI_SOURCE = "layout-composer";
const AI = { el: null, list: null, input: null, status: null, unsub: null, snap: null, open: false, dock: "side" };
const AI_DOCK_KEY = "glc:aidock";
try {
  AI.dock = localStorage.getItem(AI_DOCK_KEY) === "float" ? "float" : "side";
} catch {}

function aiHub() {
  return window.__geolibreLive && typeof window.__geolibreLive.send === "function" ? window.__geolibreLive : null;
}

// What the AI gets with every message: enough to act on "this map" or "the selected title".
function aiContext() {
  const d = S.doc;
  const sel = selectedItems();
  const brief = (i) => ({ id: i.id, type: i.type, name: i.name, x: round(i.x, 1), y: round(i.y, 1), w: round(i.w, 1), h: round(i.h, 1) });
  return {
    source: AI_SOURCE,
    plugin: "Layout Composer",
    api: "window.LayoutComposer.ai (describe, item, add, update, remove, select, page, undo, exportDialog)",
    layout: d?.name,
    page: d ? `${round(d.page.width, 1)} x ${round(d.page.height, 1)} mm (${d.page.size || "custom"})` : null,
    selected: sel.map(brief),
    items: (d?.items || []).slice(0, 80).map(brief),
    itemCount: d?.items.length || 0,
  };
}

// Light formatting for replies: **bold**, `code`, line breaks. Everything else is escaped.
function aiFormat(text) {
  return esc(String(text || ""))
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s.,;:!?)]|$)/g, "$1<i>$2</i>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
}

// Names and photos come from the bridge (hub.profile) when it has them.
function aiProfile() {
  const p = aiHub()?.profile || {};
  return {
    user: { name: p.user?.name || "You", avatar: p.user?.avatar || "" },
    bot: { name: p.bot?.name || "AI", avatar: p.bot?.avatar || "", bot: true },
  };
}

function aiAvatar(who) {
  if (who.avatar) return el("img", { class: `${NS}-aiavatar ${who.bot ? "bot" : ""}`, src: who.avatar, alt: who.name });
  return el("span", { class: `${NS}-aiavatar ${who.bot ? "bot" : ""}`, html: who.bot ? icon("sparkle", 15) : esc((who.name || "?").trim().charAt(0).toUpperCase()) });
}

function aiRow(who, mine, bubble) {
  // photo with the name to its right, the bubble underneath
  return el("div", { class: `${NS}-airow ${mine ? "me" : "ai"}` },
    el("div", { class: `${NS}-aiwho` }, aiAvatar(who), el("b", { class: `${NS}-ainame` }, who.name)),
    bubble,
  );
}

function aiStatusText(snap) {
  if (!aiHub()) return ["off", "Live MCP Bridge is not active: enable it in the Plugins menu to chat with the AI."];
  if (!snap?.connected) return ["off", "AI client not connected (Live MCP Bridge is waiting for it)."];
  if (snap.typing) return ["busy", "AI is working on it…"];
  if (snap.listening) return ["on", "AI is listening"];
  return ["idle", "AI is not listening yet: say “listen to geolibre” in the AI app. Messages wait until then."];
}

function renderAiChat(snap = AI.snap) {
  if (!AI.el) return;
  AI.snap = snap;
  const [state, text] = aiStatusText(snap);
  AI.status.className = `${NS}-aistatus ${state}`;
  AI.status.title = text;
  AI.status.querySelector("span").textContent = text;
  AI.input.disabled = !aiHub();
  if (AI.fresh && snap) {
    AI.seen = new WeakSet((snap.history || []).filter((m) => m && typeof m === "object"));
    AI.fresh = false;
  }
  const msgs = (snap?.history || []).filter((m) => m.via === AI_SOURCE && !AI.seen?.has(m));
  AI.list.replaceChildren();
  if (!msgs.length) {
    AI.list.append(el("div", { class: `${NS}-aiempty` },
      el("b", {}, "Ask AI about this layout"),
      el("p", {}, "For example: “add a legend under the map”, “make the title bold and centred”, “set the page to A3 landscape”, or “export a 300 dpi PNG”."),
    ));
  }
  const shown = msgs.slice(-40);
  const offset = msgs.length - shown.length;
  const cardsAt = (n) => {
    for (const c of AI.local) if (c.at === n || (n === msgs.length && c.at > msgs.length)) AI.list.append(aiRow(aiProfile().bot, false, aiExportBubble(c)));
  };
  cardsAt(offset);
  for (const [i, m] of shown.entries()) {
    if (i) cardsAt(offset + i);
    const mine = m.role === "user";
    if (m.role === "system") {
      AI.list.append(el("div", { class: `${NS}-aimsg sys` }, el("div", { class: `${NS}-aitext`, html: aiFormat(m.text) })));
      continue;
    }
    const who = aiProfile()[mine ? "user" : "bot"];
    const working = !mine && m.status === "working";
    const bubble = el("div", { class: `${NS}-aimsg ${mine ? "me" : "ai"}${working ? " working" : ""}` });
    if (m.text) bubble.append(el("div", { class: `${NS}-aitext` }, working ? el("i", { class: `${NS}-aispin` }) : null, el("span", { html: aiFormat(m.text) })));
    // task list: spinning while the AI works, ticked when it is done
    if (!mine && Array.isArray(m.tasks) && m.tasks.length) {
      // a task is { label, done } (ticked step by step) or a plain label
      bubble.append(el("ul", { class: `${NS}-aitasks` }, ...m.tasks.map((t) => {
        const label = typeof t === "string" ? t : t.label;
        const done = !working || (typeof t === "object" && t.done);
        return el("li", { class: done ? "done" : "run" }, el("i"), el("span", {}, label));
      })));
    }
    if (m.chart && aiHub()?.renderChart) {
      const box = el("div", { class: `${NS}-aichart` });
      bubble.append(box);
      try {
        aiHub().renderChart(box, m.chart, { height: 200 });
      } catch {}
    }
    const queued = mine && m.state === "queued";
    bubble.append(el("small", {}, queued ? el("i", { class: `${NS}-aispin sm` }) : null, `${m.time || ""}${queued ? " · waiting" : ""}`));
    AI.list.append(aiRow(who, mine, bubble));
  }
  if (shown.length) cardsAt(msgs.length);
  aiDoneCheck(msgs);
  const last = shown[shown.length - 1];
  if (last && last.role === "bot" && last.status !== "working" && !snap?.typing && aiHub()) AI.list.append(aiQuickReplies());
  if (snap?.typing) {
    const bot = aiProfile().bot;
    AI.list.append(aiRow(bot, false, el("div", { class: `${NS}-aimsg ai ${NS}-aityping` },
      el("span", { class: `${NS}-aidots` }, el("span"), el("span"), el("span")),
      el("em", {}, `${bot.name} is thinking…`),
    )));
  }
  AI.list.scrollTop = AI.list.scrollHeight;
}

function aiSend() {
  const hub = aiHub();
  const text = AI.input.value.trim();
  if (!text || !hub) return;
  AI.chips = null;
  aiShowVersions(false);
  hub.send(text, aiContext());
  AI.input.value = "";
  AI.input.style.height = "";
  setAiOpen(true);
  renderAiChat(hub.snapshot?.());
}

function setAiOpen(open) {
  AI.open = open;
  AI.el?.classList.toggle("open", open);
  S.ui.root?.querySelector(`.${NS}-aitoggle`)?.classList.toggle("on", open);
  aiApplyDock();
  if (open) {
    AI.list.scrollTop = AI.list.scrollHeight;
    setTimeout(() => AI.input?.focus(), 30);
  }
}

// "side": a column at the right of the canvas (default); "float": a bar at the bottom centre.
function aiApplyDock() {
  if (!AI.el) return;
  // built into GeoLibre (Layout View): the AI chat is not part of this build
  if (S.embedded) AI.open = false;
  const side = AI.dock === "side";
  AI.el.classList.toggle("side", side);
  const stage = AI.el.parentElement;
  const was = stage?.classList.contains(`${NS}-aiside`);
  stage?.classList.toggle(`${NS}-aiside`, side && AI.open);
  // focus mode: the docked chat takes the place of the item and property panels
  S.ui.root?.classList.toggle("ai-focus", side && AI.open);
  const btn = AI.el.querySelector(`.${NS}-aidock`);
  if (btn) {
    btn.innerHTML = icon(side ? "dockfloat" : "dockside", 15);
    btn.title = side ? "Float in the middle" : "Dock to the sidebar";
  }
  if (S.ui.scroll && was !== stage?.classList.contains(`${NS}-aiside`)) {
    requestAnimationFrame(() => {
      if (S.autoFit) fitPage();
      else drawRulers();
    });
  }
}

function setAiDock(dock) {
  AI.dock = dock === "float" ? "float" : "side";
  try {
    localStorage.setItem(AI_DOCK_KEY, AI.dock);
  } catch {}
  aiApplyDock();
}

function buildAiChat() {
  AI.list = el("div", { class: `${NS}-ailist` });
  AI.status = el("div", { class: `${NS}-aistatus` }, el("i"), el("span"));
  AI.input = el("textarea", { class: `${NS}-aiinput`, rows: 1, placeholder: "Ask AI to change this layout…" });
  AI.input.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      aiSend();
    }
    if (e.key === "Escape") setAiOpen(false);
  });
  AI.input.addEventListener("input", () => {
    AI.input.style.height = "";
    AI.input.style.height = `${Math.min(120, AI.input.scrollHeight)}px`;
  });
  AI.input.addEventListener("focus", () => setAiOpen(true));
  const send = el("button", { type: "button", class: `${NS}-aisend`, title: "Send (Enter)", html: icon("send", 16), onclick: aiSend });
  const head = el("div", { class: `${NS}-aihead` },
    el("span", { class: `${NS}-aititle`, html: `${icon("sparkle", 14)}<b>Ask AI</b>` }),
    AI.status,
    iconBtn("history", "Versions", () => aiShowVersions(!AI.el.classList.contains("showv")), `${NS}-aihist`),
    iconBtn(AI.sound ? "bell" : "belloff", AI.sound ? "Sound on (click to mute)" : "Sound off (click to unmute)", () => aiSetSound(!AI.sound), `${NS}-aisound`),
    iconBtn("dockside", "Dock to the sidebar", () => setAiDock(AI.dock === "side" ? "float" : "side"), `${NS}-aidock`),
    iconBtn("chevron", "Collapse", () => setAiOpen(false), `${NS}-aicollapse`),
  );
  // shown while the AI cursor is changing the layout
  AI.work = el("div", { class: `${NS}-aiwork` }, el("i", { class: `${NS}-aispin` }), el("span", {}, "Editing the layout…"));
  AI.vlist = el("div", { class: `${NS}-aivers` });
  AI.el = el("div", { class: `${NS}-aichat` },
    el("div", { class: `${NS}-aipanel` }, head, AI.list, AI.vlist, AI.work),
    el("div", { class: `${NS}-aibar` }, AI.input, send),
  );
  // closed until asked for (the ✦ button), so the canvas keeps its width
  AI.open = false;
  AI.el.classList.toggle("open", AI.open);
  queueMicrotask(() => {
    S.ui.root?.querySelector(`.${NS}-aitoggle`)?.classList.toggle("on", AI.open);
    aiApplyDock();
  });
  return AI.el;
}

// Connect to the bridge now, and again whenever it appears later.
function connectAiChat() {
  AI.unsub?.();
  AI.unsub = null;
  const hub = aiHub();
  if (hub?.subscribe) AI.unsub = hub.subscribe((snap) => renderAiChat(snap));
  else renderAiChat(null);
  clearInterval(AI.poll);
  AI.poll = setInterval(() => {
    const h = aiHub();
    if (h && !AI.unsub) connectAiChat();
    if (!h && AI.unsub) {
      AI.unsub();
      AI.unsub = null;
      renderAiChat(null);
    }
  }, 3000);
  S.disposers.push(() => {
    clearInterval(AI.poll);
    AI.unsub?.();
    AI.unsub = null;
    AIC.el?.remove();
    AIC.el = null;
    AIC.x = AIC.y = null;
  });
}

// ---- AI cursor: each change made through the API is shown as a cursor that
// glides to the item, clicks it and drags it, then the change is applied.
// Steps run one after another, so a burst of calls plays back in order.
const AIC = { el: null, x: null, y: null, chain: Promise.resolve(), on: true, speed: 1 };
const aiWait = (ms) => new Promise((r) => setTimeout(r, ms / AIC.speed));

function aiCursorEl() {
  if (AIC.el?.isConnected) return AIC.el;
  AIC.el = el("div", { class: `${NS}-aicursor`, html: `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 2l15 10.5-6.6 1.3 3.9 7.4-3 1.6-3.9-7.5L4 20z" fill="#d97757" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg><span></span>` });
  document.body.append(AIC.el);
  return AIC.el;
}

// page mm -> client px, scrolling the canvas first when the point is off screen
function aiClientPoint(x, y) {
  const sc = S.ui.scroll;
  const r = S.ui.paper.getBoundingClientRect();
  let cx = r.left + x * S.zoom;
  let cy = r.top + y * S.zoom;
  const v = sc.getBoundingClientRect();
  const dx = cx < v.left + 40 ? cx - v.left - 80 : cx > v.right - 40 ? cx - v.right + 80 : 0;
  const dy = cy < v.top + 40 ? cy - v.top - 80 : cy > v.bottom - 40 ? cy - v.bottom + 80 : 0;
  if (dx || dy) {
    sc.scrollLeft += dx;
    sc.scrollTop += dy;
    cx -= dx;
    cy -= dy;
  }
  return [cx, cy];
}

async function aiCursorMove(x, y, label, drag = false) {
  const c = aiCursorEl();
  const [cx, cy] = aiClientPoint(x, y);
  if (AIC.x == null) {
    const R = S.ui.root.getBoundingClientRect();
    AIC.x = R.left + R.width / 2;
    AIC.y = R.bottom - 90;
    c.style.transition = "none";
    c.style.transform = `translate(${AIC.x}px, ${AIC.y}px)`;
    void c.offsetWidth;
  }
  const ms = clamp(Math.hypot(cx - AIC.x, cy - AIC.y) * 0.9, 180, 650);
  if (label != null) c.querySelector("span").textContent = label;
  c.classList.add("on");
  c.classList.toggle("drag", drag);
  c.style.transition = `transform ${ms / AIC.speed}ms cubic-bezier(.45,.05,.25,1)`;
  c.style.transform = `translate(${cx}px, ${cy}px)`;
  AIC.x = cx;
  AIC.y = cy;
  await aiWait(ms + 30);
}

async function aiCursorClick() {
  const c = aiCursorEl();
  c.classList.remove("click");
  void c.offsetWidth;
  c.classList.add("click");
  await aiWait(220);
}

function aiCursorHide() {
  clearTimeout(AIC.hide);
  AIC.hide = setTimeout(() => AIC.el?.classList.remove("on", "drag"), 1600);
}

// Queue one visible step; `show` animates the cursor, `apply` makes the change.
function aiWorking(delta) {
  const was = AIC.busy || 0;
  AIC.busy = Math.max(0, was + delta);
  if (!was && AIC.busy) aiVersionHook(true);
  if (was && !AIC.busy) aiVersionHook(false);
  if (!AI.work) return;
  if (AIC.busy) {
    clearTimeout(AIC.workOff);
    AI.work.querySelector("span").textContent = `${aiProfile().bot.name} is editing the layout…`;
    AI.work.classList.add("on");
    AI.el?.classList.add("busy");
  } else {
    // linger a moment so quick steps don't flicker
    AIC.workOff = setTimeout(() => {
      AI.work?.classList.remove("on");
      AI.el?.classList.remove("busy");
    }, 700);
  }
}

function aiStep(show, apply) {
  const run = async () => {
    clearTimeout(AIC.hide);
    aiWorking(1);
    try {
      if (AIC.on && S.open && S.ui.paper) {
        try {
          await show();
        } catch (e) {
          console.warn("[Layout Composer] AI cursor", e);
        }
      }
      const out = apply();
      if (AIC.on && S.open) aiCursorHide();
      return out;
    } finally {
      aiGlowOff();
      aiWorking(-1);
    }
  };
  const p = AIC.chain.then(run, run);
  AIC.chain = p.catch(() => {});
  return p;
}

const aiCenter = (r) => [r.x + r.w / 2, r.y + r.h / 2];
const AI_GEOM = ["x", "y", "w", "h"];
const aiEase = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// Run fn(t) for t 0..1 over ms on animation frames.
function aiAnimate(ms, fn) {
  return new Promise((done) => {
    const t0 = performance.now();
    const dur = ms / AIC.speed;
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      fn(aiEase(t));
      if (t < 1) requestAnimationFrame(tick);
      else done();
    };
    requestAnimationFrame(tick);
  });
}

// Put the cursor on a page point at once (used while dragging).
function aiCursorAt(x, y) {
  const c = aiCursorEl();
  const r = S.ui.paper.getBoundingClientRect();
  AIC.x = r.left + x * S.zoom;
  AIC.y = r.top + y * S.zoom;
  c.style.transition = "none";
  c.style.transform = `translate(${AIC.x}px, ${AIC.y}px)`;
}

// Drag the item from its geometry to `to`, holding the centre (move) or the
// bottom-right handle (resize). The item is redrawn live; the caller restores
// and commits, so undo still goes back to the original.
async function aiDragItem(it, to) {
  const from = { x: it.x, y: it.y, w: it.w, h: it.h };
  const resize = to.w !== from.w || to.h !== from.h;
  const grip = (g) => (resize ? [g.x + g.w, g.y + g.h] : aiCenter(g));
  const [gx, gy] = grip(from);
  await aiCursorMove(gx, gy, resize ? "Resize" : "Move");
  await aiCursorClick();
  aiCursorEl().classList.add("drag");
  const dist = Math.hypot(to.x - from.x, to.y - from.y) + Math.hypot(to.w - from.w, to.h - from.h);
  await aiAnimate(clamp(dist * S.zoom * 2.2, 280, 900), (t) => {
    for (const k of AI_GEOM) it[k] = from[k] + (to[k] - from[k]) * t;
    renderPaper([it.id]);
    renderSelection();
    aiGlow(it);
    aiCursorAt(...grip(it));
  });
  aiCursorEl().classList.remove("drag");
}

// Type `text` into a text item: erase back to the shared start, then type the rest.
async function aiTypeText(it, text) {
  const from = String(it.props.text ?? "");
  let keep = 0;
  while (keep < from.length && keep < text.length && from[keep] === text[keep]) keep++;
  const show = (s, caret) => {
    it.props.text = caret ? `${s}|` : s;
    renderPaper([it.id]);
  };
  aiCursorEl().querySelector("span").textContent = "Typing…";
  const erase = from.length - keep;
  if (erase > 0) await aiAnimate(clamp(erase * 12, 120, 600), (t) => show(from.slice(0, from.length - Math.round(erase * t)), true));
  const add = text.length - keep;
  if (add > 0) await aiAnimate(clamp(add * 38, 200, 2600), (t) => show(text.slice(0, keep + Math.round(add * t)), true));
  show(text, false);
}

// ---- API for the AI (also handy from the browser console). Changes are
// queued behind the cursor animation and return promises; await them before
// reading the result back with item() or describe().
function aiApi() {
  const find = (id) => {
    const it = findItem(id);
    if (!it) throw new Error(`No item with id ${id}`);
    return it;
  };
  return {
    describe: () => ({ ...aiContext(), page: clone(S.doc.page) }),
    item: (id) => clone(find(id)),
    // cursor(false) applies changes instantly; cursor(true, 2) plays them at double speed
    cursor(on = true, speed = 1) {
      AIC.on = !!on;
      AIC.speed = clamp(+speed || 1, 0.25, 8);
      return AIC.on;
    },
    done: () => AIC.chain,
    // quick-reply buttons under the latest answer; each sends its text when clicked
    suggest(list) {
      AI.chips = [].concat(list || []).map(String).filter(Boolean).slice(0, 6);
      renderAiChat();
      return AI.chips;
    },
    // save a version now (it also happens before and after every AI edit)
    saveVersion: (label) => aiSaveVersion(label || "Saved by AI"),
    // tool: map, inset, legend, colorbar, north, scalebar, text, heading, subheading, body, caption,
    // maplabel, callout, title, table, latex, shape, image, marker, path, icon, attrtable, chart
    add(tool, rect = null, variant) {
      return aiStep(
        async () => {
          if (!rect) return;
          aiGlow(rect);
          await aiCursorMove(rect.x, rect.y, `Add ${tool}`);
          await aiCursorClick();
          await aiCursorMove(rect.x + rect.w, rect.y + rect.h, null, true);
        },
        () => {
          const before = new Set(S.doc.items.map((i) => i.id));
          if (rect) addItemFromTool(tool, rect, variant);
          else addAtCenter(tool, variant);
          const it = S.doc.items.find((i) => !before.has(i.id));
          return it ? it.id : null;
        },
      );
    },
    // patch: { x, y, w, h, rot, name, opacity, hidden, locked, props: { ...deep-merged } }
    update(id, patch = {}) {
      const it = find(id);
      const orig = { x: it.x, y: it.y, w: it.w, h: it.h, text: it.props?.text };
      return aiStep(
        async () => {
          const [x, y] = aiCenter(it);
          aiGlow(it);
          await aiCursorMove(x, y, it.name || it.type);
          await aiCursorClick();
          select([id]);
          try {
            if (AI_GEOM.some((k) => k in patch && +patch[k] !== it[k])) {
              const to = { x: it.x, y: it.y, w: it.w, h: it.h };
              for (const k of AI_GEOM) if (k in patch) to[k] = +patch[k];
              await aiDragItem(it, to);
            }
            const text = patch.props?.text;
            if (typeof text === "string" && typeof it.props?.text === "string" && text !== it.props.text) {
              const [tx, ty] = [it.x + Math.min(4, it.w / 2), it.y + Math.min(3, it.h / 2)];
              await aiCursorMove(tx, ty, "Typing…");
              await aiTypeText(it, text);
            }
          } finally {
            // back to the original so commit() records a clean undo step
            for (const k of AI_GEOM) it[k] = orig[k];
            if (orig.text !== undefined) it.props.text = orig.text;
          }
        },
        () => {
          commit(() => {
            const { props, ...top } = patch;
            Object.assign(it, top);
            if (props) it.props = deepMerge(it.props, props);
          });
          return clone(it);
        },
      );
    },
    remove(ids) {
      const set = new Set([].concat(ids));
      return aiStep(
        async () => {
          for (const it of S.doc.items.filter((i) => set.has(i.id))) {
            const [x, y] = aiCenter(it);
            aiGlow(it);
            await aiCursorMove(x, y, `Delete ${it.name || it.type}`);
            await aiCursorClick();
          }
        },
        () => {
          commit(() => (S.doc.items = S.doc.items.filter((i) => !set.has(i.id))));
          return S.doc.items.length;
        },
      );
    },
    select(ids) {
      const list = [].concat(ids || []);
      return aiStep(
        async () => {
          const it = list.length && findItem(list[0]);
          if (!it) return;
          const [x, y] = aiCenter(it);
          aiGlow(it);
          await aiCursorMove(x, y, it.name || it.type);
          await aiCursorClick();
        },
        () => select(list),
      );
    },
    page(patch = {}) {
      return aiStep(
        async () => {
          await aiCursorMove(4, 4, "Page setup");
          await aiCursorClick();
        },
        () => {
          commit(() => Object.assign(S.doc.page, patch));
          fitPage();
          return clone(S.doc.page);
        },
      );
    },
    // layouts in the library
    layouts: () => Object.values(S.library.layouts).map((l) => ({ id: l.id, name: l.name, items: l.items.length, active: l.id === S.doc.id })),
    newLayout: (name) => aiStep(async () => {}, () => {
      newLayout(name ? newDoc(name) : undefined);
      return S.doc.id;
    }),
    switchLayout: (id) => aiStep(async () => {}, () => switchLayout(id)),
    // KLHK standard (SK MENLHK 399/2024): spec, symbology catalogue, RBI legend, layouts
    klhk: {
      spec: () => clone(KLHK_SPEC),
      themes: (q) => klhkThemes(q),
      theme: (id) => klhkTheme(id),
      legend: (themeId, present) => klhkLegendEntries(themeId, present),
      baseLegend: (keys, variant) => klhkBaseLegend(keys, variant),
      kawasanClass: (v) => klhkKawasanClass(v)?.label || null,
      styleKawasan: (layerId, field) => klhkStyleKawasan(layerId, field),
      applyTheme: (layerId, themeId, field) => klhkApplyTheme(layerId, themeId, field),
      basemapStyle: (variant, opts) => klhkBasemapStyle(variant, opts),
      newLayout: (opts) => aiStep(async () => {}, () => klhkNewLayout(opts)),
    },
    undo: () => aiStep(async () => {}, () => undo()),
    exportDialog: () => aiStep(async () => {}, () => openExportDialog()),
  };
}
